# Sequence Cron Container

This container runs the background jobs for the Sequence application, specifically handling campaign-related tasks.

## Overview

The cron container runs two main jobs:
1. Campaign Cron Job - Processes campaign nodes and their states
2. Campaign Node Timeout Job - Handles timeout conditions for campaign nodes

## Configuration

The container is configured with:
- Node.js 18 Alpine
- Development mode enabled
- Access to the same database and Redis as the API
- Port 3001 (different from API's 3000)

## Jobs

### 1. Campaign Cron Job
- Runs every minute
- Processes campaign nodes that are ready for execution
- Handles timed-out campaign nodes
- Uses a caching mechanism to optimize campaign node evaluation
- Key responsibilities:
  - Processing next campaign node states
  - Evaluating campaign nodes
  - Managing campaign node evaluators

### 2. Campaign Node Timeout Job
- Runs every minute
- Checks for campaign nodes that have exceeded their timeout period
- Updates node states to ERROR when timeouts occur
- Logs timeout events and errors

## Environment Variables

The container uses the following environment variables:
- `NODE_ENV`: Set to 'development' for development mode
- `PORT`: 3001
- Database configuration (same as API)
- Redis configuration (same as API)

## Running the Container

The container can be started using:
```bash
docker-compose up -d cron
```

To view logs:
```bash
docker-compose logs -f cron
```

## Development

For development:
1. The container runs in development mode
2. Code changes are reflected immediately due to volume mounts
3. Uses ts-node-dev for hot reloading
4. Shares the same codebase with the API through volume mounts

## Troubleshooting

Common issues:
1. If the container fails to start, check:
   - Database connection
   - Redis connection
   - Environment variables
2. If jobs aren't running:
   - Check the logs for errors
   - Verify the cron daemon is running
   - Ensure the database has the necessary tables

## Monitoring

The container logs can be monitored using:
```bash
docker-compose logs -f cron
```

Logs will show:
- Job execution status
- Error messages
- Timeout events
- Campaign node processing results 