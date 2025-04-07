import Mustache from "mustache";
import Email from "../../models/email.model";
import ProductUser from "../../models/productUser.model";
import logger from "../../utils/logger";
import AbstractEmailProvider from "./providers/abstractEmailProvider";
import EmailThrottler from "./emailThrottler";

export class SendEmail {
  private static throttler: EmailThrottler | null = null;
  provider: AbstractEmailProvider;
  productUser: ProductUser | any; // Allow any type for mock users
  email: Email;
  toAddress: string;

  setToAddress(toAddress: string) {
    this.toAddress = toAddress;
    return this;
  }

  setProductUser(productUser: ProductUser | any) {
    this.productUser = productUser;
    return this;
  }

  setProvider(provider: AbstractEmailProvider) {
    this.provider = provider;
    return this;
  }

  setEmail(email: Email) {
    this.email = email;
    return this;
  }

  getPayload() {
    // Convert ProductUser model to plain object if needed
    const userData = this.productUser instanceof ProductUser
      ? this.productUser.toJSON()
      : this.productUser;

    // Include traits at the top level for template rendering
    const templateData = {
      ...userData,
      ...(userData.traits || {})
    };

    const renderedHtml = Mustache.render(
      this.email.bodyHtml,
      templateData
    );
    const renderedSubject = Mustache.render(
      this.email.subject,
      templateData
    );

    return {
      html: renderedHtml,
      subject: renderedSubject,
      to: this.toAddress ? this.toAddress : userData.email,
    };
  }

  public static initializeThrottler(config?: {
    maxConcurrent?: number;
    minTime?: number;
    reservoir?: number;
    reservoirRefreshAmount?: number;
    reservoirRefreshInterval?: number;
  }) {
    if (!this.throttler) {
      this.throttler = new EmailThrottler(config);
    }
    return this.throttler;
  }

  public static getMetrics() {
    if (!this.throttler) {
      throw new Error("Throttler not initialized");
    }
    return this.throttler.getMetrics();
  }

  public static async stop() {
    if (this.throttler) {
      await this.throttler.stop();
      this.throttler = null;
    }
  }

  async send() {
    logger.info("[SendEmail:send] Starting email send...");
    const payload = this.getPayload();

    try {
      logger.info(`[SendEmail:send] Sending email to ${payload.to}`);
      if (SendEmail.throttler) {
        const result = await SendEmail.throttler.schedule(() => this.provider.send(payload));
        logger.info("[SendEmail:send] Email sent successfully!");
        return result;
      } else {
        const result = await this.provider.send(payload);
        logger.info("[SendEmail:send] Email sent successfully!");
        return result;
      }
    } catch (error) {
      logger.error(
        "[SendEmail:send] An error occurred sending the email: " + error
      );
      throw error;
    }
  }

  public static async send(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<void> {
    // Your existing email sending logic here
    // ... existing code ...
  }
}

export default SendEmail;
