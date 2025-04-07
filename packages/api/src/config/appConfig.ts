import { AppOptions } from "src/app";
import queueConfig from "./queue.config";

interface EmailConfig {
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    fromAddress: string;
  };
  sendgrid?: {
    fromAddress: string;
    apiKey: string;
  };
  mailgun?: {
    fromAddress: string;
    apiKey: string;
    domain: string;
  };
  throttler?: {
    maxConcurrent?: number;
    minTime?: number;
    reservoir?: number;
    reservoirRefreshAmount?: number;
    reservoirRefreshInterval?: number;
  };
  monitoring?: {
    alertThresholds: {
      errorRate: number;
      queueSize: number;
      dropRate: number;
    };
    checkInterval: number;
  };
}

const appConfig: AppOptions = {
  email: {
    smtp: process.env.SMTP_HOST ? {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "465"),
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
    throttler: {
      maxConcurrent: parseInt(process.env.EMAIL_MAX_CONCURRENT || "5"),
      minTime: parseInt(process.env.EMAIL_MIN_TIME || "200"),
      reservoir: parseInt(process.env.EMAIL_RESERVOIR || "100"),
      reservoirRefreshAmount: parseInt(process.env.EMAIL_RESERVOIR_REFRESH_AMOUNT || "100"),
      reservoirRefreshInterval: parseInt(process.env.EMAIL_RESERVOIR_REFRESH_INTERVAL || "60000"),
    },
    monitoring: {
      alertThresholds: {
        errorRate: parseInt(process.env.EMAIL_ERROR_RATE_THRESHOLD || "5"),
        queueSize: parseInt(process.env.EMAIL_QUEUE_SIZE_THRESHOLD || "100"),
        dropRate: parseInt(process.env.EMAIL_DROP_RATE_THRESHOLD || "10"),
      },
      checkInterval: parseInt(process.env.EMAIL_MONITORING_INTERVAL || "60000"),
    },
  },
  queue: {
    queueOpts: queueConfig,
    redisOpts: {},
  },
};

export default appConfig;
