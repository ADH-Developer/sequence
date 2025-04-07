# Email Service

This service provides email sending functionality with rate limiting and monitoring capabilities.

## Components

### SendEmail

The main class for sending emails. It supports:
- Multiple email providers (SendGrid, Mailgun)
- Email templating with Mustache
- Rate limiting through the EmailThrottler

#### Usage

```typescript
// Initialize the throttler (usually done at app startup)
SendEmail.initializeThrottler({
  maxConcurrent: 5,
  minTime: 200,
  reservoir: 100,
  reservoirRefreshAmount: 100,
  reservoirRefreshInterval: 60000,
});

// Send an email
const sendEmail = new SendEmail()
  .setProvider(emailProvider)
  .setEmail(emailTemplate)
  .setProductUser(user)
  .setToAddress("recipient@example.com");

await sendEmail.send();
```

### EmailThrottler

Manages email sending rate limits using Bottleneck and Redis.

#### Configuration

```typescript
interface ThrottlerConfig {
  maxConcurrent?: number;    // Maximum concurrent emails (default: 5)
  minTime?: number;          // Minimum time between emails in ms (default: 200)
  reservoir?: number;        // Maximum emails per interval (default: 100)
  reservoirRefreshAmount?: number;    // How many emails to add per refresh
  reservoirRefreshInterval?: number;  // Refresh interval in ms (default: 60000)
}
```

### EmailMonitoring

Monitors email sending metrics and sends alerts when thresholds are exceeded.

#### Configuration

```typescript
interface MonitoringConfig {
  alertThresholds: {
    errorRate: number;    // Percentage of errors to trigger alert (default: 5%)
    queueSize: number;    // Number of queued emails to trigger alert (default: 100)
    dropRate: number;     // Percentage of dropped emails to trigger alert (default: 10%)
  };
  checkInterval: number;  // How often to check metrics in ms (default: 60000)
}
```

## Metrics

The system tracks the following metrics:
- Total emails sent
- Number of errors
- Number of throttled/dropped emails
- Current queue size
- Number of running emails
- Current reservoir level

## Best Practices

1. Always initialize the throttler before sending emails
2. Monitor the metrics regularly to adjust throttling limits
3. Set appropriate alert thresholds based on your email volume
4. Use Redis for distributed rate limiting in multi-instance deployments
5. Implement proper error handling and retry logic

## Troubleshooting

Common issues and solutions:

1. **Emails are being dropped**
   - Check if the reservoir is too small
   - Verify Redis connection
   - Monitor queue size and adjust maxConcurrent

2. **High error rate**
   - Check email provider configuration
   - Verify template rendering
   - Monitor provider rate limits

3. **Slow email delivery**
   - Adjust minTime between emails
   - Increase maxConcurrent if possible
   - Check Redis performance

## Monitoring

The system provides several monitoring capabilities:

1. **Logging**
   - All operations are logged with appropriate levels
   - Errors are logged with stack traces
   - Metrics are logged periodically

2. **Alerts**
   - High error rates
   - Large email queues
   - High drop rates

3. **Metrics**
   - Available through SendEmail.getMetrics()
   - Can be integrated with monitoring systems 