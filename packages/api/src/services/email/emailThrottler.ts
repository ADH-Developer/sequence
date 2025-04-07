import Bottleneck from "bottleneck";
import Redis from "ioredis";
import logger from "src/utils/logger";

interface ThrottlerConfig {
    maxConcurrent?: number;
    minTime?: number;
    reservoir?: number;
    reservoirRefreshAmount?: number;
    reservoirRefreshInterval?: number;
}

class EmailThrottler {
    private limiter: Bottleneck;
    private redis: Redis;
    private metrics: {
        totalEmails: number;
        throttledEmails: number;
        errors: number;
    };

    constructor(config: ThrottlerConfig = {}) {
        // Default configuration
        const defaultConfig = {
            maxConcurrent: 5,
            minTime: 200, // 200ms between emails
            reservoir: 100, // 100 emails per minute
            reservoirRefreshAmount: 100,
            reservoirRefreshInterval: 60 * 1000, // 1 minute
        };

        const finalConfig = { ...defaultConfig, ...config };

        // Initialize Redis connection
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'redis',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        // Initialize Bottleneck with Redis storage
        this.limiter = new Bottleneck({
            ...finalConfig,
            datastore: "redis",
            clientOptions: {
                host: process.env.REDIS_HOST || 'redis',
                port: parseInt(process.env.REDIS_PORT || '6379'),
            },
            clearDatastore: false,
        });

        // Initialize metrics
        this.metrics = {
            totalEmails: 0,
            throttledEmails: 0,
            errors: 0,
        };

        // Set up event listeners
        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.limiter.on("error", (error) => {
            logger.error(`[EmailThrottler] Error: ${error.message}`);
            this.metrics.errors++;
        });

        this.limiter.on("dropped", (dropped) => {
            logger.warn(`[EmailThrottler] Dropped: ${dropped}`);
            this.metrics.throttledEmails++;
        });

        this.limiter.on("debug", (message, data) => {
            logger.debug(`[EmailThrottler] ${message}`, data);
        });
    }

    async schedule<T>(fn: () => Promise<T>): Promise<T> {
        try {
            const result = await this.limiter.schedule(fn);
            this.metrics.totalEmails++;
            return result;
        } catch (error) {
            this.metrics.errors++;
            throw error;
        }
    }

    getMetrics() {
        return this.metrics;
    }

    async stop() {
        await this.limiter.disconnect();
        await this.redis.quit();
    }
}

export default EmailThrottler; 