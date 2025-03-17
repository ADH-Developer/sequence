import { AppOptions } from "src/app";
import queueConfig from "./queue.config";

const appConfig: AppOptions = {
  email: {
    smtp: process.env.SMTP_HOST ? {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      fromAddress: process.env.FROM_ADDRESS,
    } : undefined,
    sendgrid: process.env.SENDGRID_API_KEY ? {
      fromAddress: process.env.FROM_ADDRESS,
      apiKey: process.env.SENDGRID_API_KEY,
    } : undefined,
    mailgun: process.env.MAILGUN_API_KEY ? {
      fromAddress: process.env.FROM_ADDRESS,
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
    } : undefined,
  },
  queue: {
    queueOpts: queueConfig,
    redisOpts: {},
  },
};

export default appConfig;
