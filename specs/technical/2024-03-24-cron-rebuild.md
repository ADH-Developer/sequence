# Cron System Rebuild Specification

## Overview
The current cron implementation in Sequence needs to be replaced with a more reliable solution. The existing system uses `node-cron` with a custom implementation that has proven to be problematic. This specification outlines the implementation of a new cron system using Bull Queue with Redis to replace the non-functioning current implementation. We will be setting up a new Redis server specifically for this implementation and removing the old Redis instance that was used by the cron system.

## Current Implementation Analysis
- Uses `node-cron` library
- Custom implementation with CronService, CronRunner, and CronJob classes
- Handles two main types of jobs:
  1. Campaign node execution
  2. Campaign node timeout handling
- Runs on a per-minute schedule
- Uses Redis for some state management (to be replaced)
- Integrated with the main application lifecycle
- Manages campaign node states with timestamps for execution and timeouts

## Requirements

### Functional Requirements
1. Must handle campaign node execution scheduling
2. Must handle campaign node timeout monitoring
3. Must support business hours scheduling (9 AM - 5 PM local time)
4. Must support specific time scheduling
5. Must be resilient to application restarts
6. Must maintain job state across restarts
7. Must handle concurrent job execution safely
8. Must track job attempts and timeouts
9. Must maintain audit trail of job execution

### Non-Functional Requirements
1. **Reliability**: System must be highly reliable with minimal downtime
2. **Scalability**: Must handle increasing number of campaigns and nodes
3. **Maintainability**: Simple to understand and maintain
4. **Monitoring**: Must provide visibility into job execution status
5. **Error Handling**: Must handle failures gracefully with proper logging
6. **Performance**: Must execute jobs efficiently without blocking the main application
7. **Data Consistency**: Must maintain data integrity across job executions

## Technical Solution: Bull Queue with Redis

### Architecture Overview
1. **Queue Structure**
   - `campaign-execution-queue`: For campaign node execution
   - `campaign-timeout-queue`: For campaign node timeout monitoring
   - Note: `scheduling-queue` removed as it's not needed for MVP

2. **Job Types**
   ```typescript
   interface CampaignExecutionJob {
     campaignId: string;
     nodeId: string;
     userId: string;
     productUserId: string;
     executionTime: Date;
     attempts: number;
     didTimeout: boolean;
   }

   interface CampaignTimeoutJob {
     campaignId: string;
     nodeId: string;
     userId: string;
     productUserId: string;
     timeoutAt: Date;
     attempts: number;
   }
   ```

3. **Queue Configuration**
   ```typescript
   const defaultConfig = {
     attempts: 3,
     backoff: {
       type: 'exponential',
       delay: 1000,
     },
     removeOnComplete: false,
     removeOnFail: false,
     jobId: (job: Job) => `${job.data.campaignId}-${job.data.nodeId}-${job.data.productUserId}`,
   };
   ```

### Implementation Details

1. **Queue Setup**
   ```typescript
   // src/queue/index.ts
   import Queue from 'bull';
   import { RedisConfig } from 'src/config';

   // Ensure RedisConfig exists and is properly typed
   interface RedisConfig {
     host: string;
     port: number;
     password?: string;
     db?: number;
   }

   export const campaignExecutionQueue = new Queue('campaign-execution', {
     redis: RedisConfig,
     defaultJobOptions: defaultConfig,
     limiter: {
       max: 1000, // Max jobs per time window
       duration: 1000, // Time window in ms
     },
   });

   export const campaignTimeoutQueue = new Queue('campaign-timeout', {
     redis: RedisConfig,
     defaultJobOptions: defaultConfig,
   });
   ```

2. **Job Processors**
   ```typescript
   // src/queue/processors/campaignExecution.ts
   import { CampaignStateEnum } from 'src/types/campaign';
   import { updateNodeState, processCampaignNode, handleExecutionFailure } from 'src/services/campaign';

   campaignExecutionQueue.process(async (job) => {
     const { campaignId, nodeId, userId, productUserId } = job.data;
     
     // Update state to running
     await updateNodeState(campaignId, nodeId, productUserId, {
       state: CampaignStateEnum.RUNNING,
       attempts: job.attemptsMade,
     });

     try {
       // Process campaign node execution
       await processCampaignNode(campaignId, nodeId, userId, productUserId);
       
       // Update state to completed
       await updateNodeState(campaignId, nodeId, productUserId, {
         state: CampaignStateEnum.COMPLETED,
         completedAt: new Date(),
       });
     } catch (error) {
       // Handle failure
       await handleExecutionFailure(campaignId, nodeId, productUserId, error);
       throw error; // Let Bull handle retry
     }
   });

   // src/queue/processors/campaignTimeout.ts
   campaignTimeoutQueue.process(async (job) => {
     const { campaignId, nodeId, userId, productUserId } = job.data;
     
     await updateNodeState(campaignId, nodeId, productUserId, {
       state: CampaignStateEnum.TIMEOUT,
       didTimeout: true,
       completedAt: new Date(),
     });
   });
   ```

3. **Scheduling Service**
   ```typescript
   // src/services/scheduling/schedulingService.ts
   class SchedulingService {
     async scheduleCampaignNode(
       campaignId: string,
       nodeId: string,
       userId: string,
       productUserId: string,
       runAt: Date
     ) {
       const job = await campaignExecutionQueue.add(
         { 
           campaignId, 
           nodeId, 
           userId, 
           productUserId,
           attempts: 0,
           didTimeout: false
         },
         { 
           delay: runAt.getTime() - Date.now(),
           jobId: `${campaignId}-${nodeId}-${productUserId}`,
         }
       );

       // Update state to scheduled
       await updateNodeState(campaignId, nodeId, productUserId, {
         state: CampaignStateEnum.PENDING,
         runAt,
         jobId: job.id,
       });
     }

     async scheduleTimeout(
       campaignId: string,
       nodeId: string,
       userId: string,
       productUserId: string,
       timeoutAt: Date
     ) {
       const job = await campaignTimeoutQueue.add(
         { 
           campaignId, 
           nodeId, 
           userId, 
           productUserId,
           attempts: 0
         },
         { 
           delay: timeoutAt.getTime() - Date.now(),
           jobId: `timeout-${campaignId}-${nodeId}-${productUserId}`,
         }
       );

       // Update state with timeout
       await updateNodeState(campaignId, nodeId, productUserId, {
         timeoutAt,
         timeoutJobId: job.id,
       });
     }

     async handleBusinessHours(campaignId: string, nodeId: string) {
       const now = new Date();
       const hour = now.getHours();
       const day = now.getDay();
       
       // Skip weekends
       if (day === 0 || day === 6) {
         const nextMonday = new Date(now);
         nextMonday.setDate(nextMonday.getDate() + (8 - day));
         nextMonday.setHours(9, 0, 0, 0);
         return nextMonday;
       }
       
       if (hour < 9) {
         return new Date(now.setHours(9, 0, 0, 0));
       }
       
       if (hour > 17) {
         const tomorrow = new Date(now);
         tomorrow.setDate(tomorrow.getDate() + 1);
         tomorrow.setHours(9, 0, 0, 0);
         return tomorrow;
       }
       
       return now;
     }
   }
   ```

### Monitoring and Observability

1. **Queue Events**
   ```typescript
   import { logger } from 'src/utils/logger';

   campaignExecutionQueue.on('completed', (job) => {
     logger.info(`Campaign execution completed: ${job.id}`, {
       campaignId: job.data.campaignId,
       nodeId: job.data.nodeId,
       productUserId: job.data.productUserId,
       attempts: job.attemptsMade,
       duration: job.finishedOn - job.processedOn,
     });
   });

   campaignExecutionQueue.on('failed', (job, err) => {
     logger.error(`Campaign execution failed: ${job.id}`, {
       error: err,
       campaignId: job.data.campaignId,
       nodeId: job.data.nodeId,
       productUserId: job.data.productUserId,
       attempts: job.attemptsMade,
       duration: job.finishedOn - job.processedOn,
     });
   });
   ```

2. **Health Checks**
   - Queue length monitoring
   - Failed job tracking
   - Processing time metrics
   - Worker status
   - Job completion rates
   - Error rates by type

## Implementation Strategy

1. **Phase 1: Setup**
   - Install Bull dependencies
   - Set up new Redis server:
     ```yaml
     # docker-compose.yml additions
     services:
       redis:
         image: redis:7-alpine
         ports:
           - "6379:6379"
         volumes:
           - redis_data:/data
         command: redis-server --appendonly yes
         healthcheck:
           test: ["CMD", "redis-cli", "ping"]
           interval: 10s
           timeout: 5s
           retries: 3
         deploy:
           resources:
             limits:
               memory: 1G
             reservations:
               memory: 512M

       worker:
         build:
           context: .
           dockerfile: Dockerfile.worker
         environment:
           - NODE_ENV=production
           - REDIS_HOST=redis
           - REDIS_PORT=6379
         depends_on:
           redis:
             condition: service_healthy
         deploy:
           replicas: 1
           restart_policy:
             condition: on-failure
             max_attempts: 3
             window: 120s

     volumes:
       redis_data:
     ```
   - Configure Redis connection
   - Set up queue structure
   - Implement basic job processors
   - Add monitoring and logging
   - Create Docker configuration:
     ```dockerfile
     # Dockerfile.worker
     FROM node:18-alpine

     WORKDIR /app

     # Copy package files
     COPY package.json yarn.lock ./
     COPY packages/api/package.json ./packages/api/
     COPY packages/common/package.json ./packages/common/

     # Install dependencies
     RUN yarn install --frozen-lockfile

     # Copy source code
     COPY . .

     # Build TypeScript
     RUN yarn build

     # Set environment variables
     ENV NODE_ENV=production
     ENV REDIS_HOST=redis
     ENV REDIS_PORT=6379

     # Start worker
     CMD ["yarn", "start:worker"]
     ```

2. **Phase 2: Implementation**
   - Create scheduling service
   - Implement job processors
   - Add business hours handling
   - Write tests

3. **Phase 3: Cleanup**
   - Remove old cron files:
     - `src/cron/cronService.ts`
     - `src/cron/cronRunner.ts`
     - `src/cron/cronJob.ts`
     - `src/cron/jobs/campaignCronJob.ts`
     - `src/cron/jobs/campaignNodeTimeoutCronJob.ts`
     - `src/cron/index.ts`
     - `scripts/cronDaemon.ts`
   - Remove old cron tests:
     - `tests/cron/cronService.spec.ts`
   - Update package.json:
     - Remove `node-cron` dependency
     - Remove cron-related scripts
   - Update application startup:
     - Remove cron initialization from `src/app.ts`
     - Remove cron-related environment variables
   - Remove old Redis instance:
     - Remove old Redis service from docker-compose.yml
     - Remove old Redis volumes
     - Remove old Redis environment variables
   - Update documentation:
     - Update README.md with new cron system details
     - Update API documentation
     - Update deployment guides
   - Final testing:
     - Verify no references to old cron system remain
     - Verify all cron functionality works with new system
     - Run full test suite
     - Perform integration testing

## Success Criteria
1. All required cron functionality is implemented
2. Jobs persist across application restarts
3. System handles failures gracefully
4. Monitoring provides visibility into job execution
5. Performance meets requirements
6. Code is maintainable and well-documented
7. Business hours scheduling is accurate
8. Job state transitions are consistent
9. Error handling and retries work as expected

## Next Steps
1. Review and approve this specification
2. Create implementation tickets
3. Begin phased implementation
4. Add monitoring and alerting
5. Conduct thorough testing
6. Plan deployment strategy

## Dependencies
- bull: ^4.12.0
- @types/bull: ^4.10.0
- Redis (already in use)

## Package.json Updates
```json
{
  "scripts": {
    "start:worker": "node dist/queue/worker.js",
    "build:worker": "tsc -p tsconfig.worker.json"
  }
}
```

## TypeScript Configuration
```json
// tsconfig.worker.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "commonjs",
    "target": "es2018",
    "lib": ["es2018"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": [
    "src/queue/**/*",
    "src/services/scheduling/**/*",
    "src/services/campaign/**/*",
    "src/types/**/*",
    "src/utils/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.spec.ts",
    "**/*.test.ts"
  ]
}
```

## Worker Entry Point
```typescript
// src/queue/worker.ts
import { campaignExecutionQueue, campaignTimeoutQueue } from './index';
import { logger } from '../utils/logger';

// Process campaign execution jobs
campaignExecutionQueue.process(async (job) => {
  // ... job processor implementation ...
});

// Process campaign timeout jobs
campaignTimeoutQueue.process(async (job) => {
  // ... job processor implementation ...
});

// Handle worker events
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal. Shutting down gracefully...');
  await Promise.all([
    campaignExecutionQueue.close(),
    campaignTimeoutQueue.close()
  ]);
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal. Shutting down gracefully...');
  await Promise.all([
    campaignExecutionQueue.close(),
    campaignTimeoutQueue.close()
  ]);
  process.exit(0);
});

// Log worker startup
logger.info('Bull Queue worker started', {
  queues: ['campaign-execution', 'campaign-timeout'],
  pid: process.pid
});
```

## Implementation Tickets

### Phase 1: Core Setup
1. **Basic Infrastructure**
   - Add Bull dependency to package.json
   - Set up Redis connection
   - Create basic queue structure
   - Add error logging

2. **Job Processors**
   - Create campaign execution processor
   - Create campaign timeout processor
   - Add basic error handling
   - Add job state tracking

### Phase 2: Core Implementation
1. **Scheduling Service**
   - Create SchedulingService class
   - Implement campaign node scheduling
   - Implement timeout scheduling
   - Add basic business hours handling

2. **Testing**
   - Write basic unit tests
   - Test job execution
   - Test error handling

### Phase 3: Cleanup
1. **Remove Old System**
   - Delete old cron files:
     - `src/cron/cronService.ts`
     - `src/cron/cronRunner.ts`
     - `src/cron/cronJob.ts`
     - `src/cron/jobs/campaignCronJob.ts`
     - `src/cron/jobs/campaignNodeTimeoutCronJob.ts`
     - `src/cron/index.ts`
     - `scripts/cronDaemon.ts`
   - Remove old cron tests:
     - `tests/cron/cronService.spec.ts`
   - Update package.json:
     - Remove `node-cron` dependency
     - Remove cron-related scripts
   - Update application startup:
     - Remove cron initialization from `src/app.ts`
     - Remove cron-related environment variables
   - Remove old Redis instance:
     - Remove old Redis service from docker-compose.yml
     - Remove old Redis volumes
     - Remove old Redis environment variables
   - Update documentation:
     - Update README.md with new cron system details
     - Update API documentation
     - Update deployment guides
   - Final testing:
     - Verify no references to old cron system remain
     - Verify all cron functionality works with new system
     - Run full test suite
     - Perform integration testing

2. **Basic Documentation**
   - Update README with new cron system details
   - Update basic deployment notes

Each ticket should include:
- Clear description of the task
- Basic acceptance criteria
- Dependencies
- Testing requirements

### Phase 4: Monitoring & Maintenance
1. **Monitoring Setup**
   - Add queue metrics
   - Add job execution metrics
   - Add error tracking
   - Set up alerts

2. **Performance Optimization**
   - Optimize queue settings
   - Tune job processing
   - Optimize Redis usage
   - Add performance monitoring

3. **Documentation**
   - Add troubleshooting guide
   - Add maintenance procedures
   - Document common issues
   - Add recovery procedures

Each ticket should include:
- Clear description of the task
- Acceptance criteria
- Dependencies
- Estimated effort
- Risk assessment
- Testing requirements 