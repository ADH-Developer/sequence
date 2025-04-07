import { SendEmail } from "./sendEmail";
import logger from "src/utils/logger";

interface MonitoringConfig {
    alertThresholds: {
        errorRate: number; // Percentage of errors to trigger alert
        queueSize: number; // Number of queued emails to trigger alert
        dropRate: number; // Percentage of dropped emails to trigger alert
    };
    checkInterval: number; // How often to check metrics (in ms)
}

export class EmailMonitoring {
    private static instance: EmailMonitoring;
    private checkInterval: NodeJS.Timeout | null = null;
    private config: MonitoringConfig;

    private constructor(config: MonitoringConfig) {
        this.config = config;
    }

    public static getInstance(config?: MonitoringConfig): EmailMonitoring {
        if (!EmailMonitoring.instance) {
            EmailMonitoring.instance = new EmailMonitoring(
                config || {
                    alertThresholds: {
                        errorRate: 5, // 5% error rate threshold
                        queueSize: 100, // Alert if more than 100 emails queued
                        dropRate: 10, // 10% drop rate threshold
                    },
                    checkInterval: 60000, // Check every minute
                }
            );
        }
        return EmailMonitoring.instance;
    }

    public start(): void {
        if (this.checkInterval) {
            logger.warn("[EmailMonitoring] Monitoring already started");
            return;
        }

        this.checkInterval = setInterval(() => {
            this.checkMetrics();
        }, this.config.checkInterval);

        logger.info("[EmailMonitoring] Started monitoring email metrics");
    }

    public stop(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            logger.info("[EmailMonitoring] Stopped monitoring email metrics");
        }
    }

    private checkMetrics(): void {
        const metrics = SendEmail.getMetrics();
        if (!metrics) {
            logger.warn("[EmailMonitoring] No metrics available");
            return;
        }

        // Calculate rates
        const totalEmails = metrics.totalEmails || 1; // Avoid division by zero
        const errorRate = (metrics.errors / totalEmails) * 100;
        const dropRate = (metrics.throttledEmails / totalEmails) * 100;

        // Check thresholds
        if (errorRate > this.config.alertThresholds.errorRate) {
            this.sendAlert(
                "High Error Rate",
                `Email error rate is ${errorRate.toFixed(2)}%, above threshold of ${this.config.alertThresholds.errorRate}%`
            );
        }

        if (dropRate > this.config.alertThresholds.dropRate) {
            this.sendAlert(
                "High Drop Rate",
                `Email drop rate is ${dropRate.toFixed(2)}%, above threshold of ${this.config.alertThresholds.dropRate}%`
            );
        }

        // Log metrics periodically
        logger.info("[EmailMonitoring] Current metrics:", {
            totalEmails: metrics.totalEmails,
            errors: metrics.errors,
            throttledEmails: metrics.throttledEmails,
        });
    }

    private sendAlert(title: string, message: string): void {
        // TODO: Implement actual alerting mechanism (e.g., Slack, PagerDuty, etc.)
        logger.error(`[EmailMonitoring] ALERT: ${title} - ${message}`);
    }
} 