import EmailThrottler from "../src/services/email/emailThrottler";
import logger from "../src/utils/logger";

// Mock email provider
class MockEmailProvider {
    name = "mock";
    async send(payload: any) {
        logger.info(`[MockProvider] Would send email to ${payload.to}`);
        return Promise.resolve();
    }
}

async function testEmailThrottling(): Promise<void> {
    try {
        // Initialize throttler with test-friendly settings
        const throttler = new EmailThrottler({
            maxConcurrent: 2,
            minTime: 1000, // 1 second between emails
            reservoir: 5,  // Allow 5 emails per interval
            reservoirRefreshAmount: 5,
            reservoirRefreshInterval: 10000, // 10 seconds
        });

        logger.info("Starting email throttling test...");

        // Create test emails
        const emails = Array(10).fill(null).map((_, i) => ({
            to: `test${i}@example.com`,
            subject: `Test Email ${i}`,
            html: `<p>This is test email ${i}</p>`,
        }));

        const mockProvider = new MockEmailProvider();

        // Send emails in parallel to test throttling
        const sendPromises = emails.map((email, index) => {
            logger.info(`Sending email ${index + 1}/${emails.length}`);
            return throttler.schedule(async () => {
                return mockProvider.send(email);
            }).catch((error: Error): null => {
                logger.error(`Error sending email ${index + 1}:`, error);
                return null;
            });
        });

        // Wait for all emails to be processed
        const results = await Promise.all(sendPromises);

        // Log results
        const successful = results.filter(r => r !== null).length;
        const failed = results.filter(r => r === null).length;

        logger.info("Test completed!");
        logger.info(`Total emails: ${emails.length}`);
        logger.info(`Successful: ${successful}`);
        logger.info(`Failed: ${failed}`);

        // Get and log metrics
        const metrics = throttler.getMetrics();
        logger.info("Final metrics:", metrics);

        // Stop throttler
        await throttler.stop();

    } catch (error) {
        logger.error("Test failed:", error);
    }
}

// Run the test
testEmailThrottling(); 