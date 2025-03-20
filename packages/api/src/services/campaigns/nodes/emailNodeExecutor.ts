import EmailCampaignNode from "common/campaign/nodes/emailCampaignNode";
import CampaignNodeState from "src/models/campaignNodeState.model";
import Email from "src/models/email.model";
import ProductUser from "src/models/productUser.model";
import AbstractNodeExecutor from "./abstractNodeExecutor";
import logger from "src/utils/logger";
import ExecutionResult, { ExecutionResultEnum } from "../executionResult";
import App from "src/app";
import SendEmail from "src/services/email/sendEmail";
import CampaignNodeExecutionError from "src/error/campaignNodeExecutionError";
import moment from "moment";
import { CampaignStateEnum } from "src/models/campaign.model";
import { Op } from "sequelize";
import SentEmail from "src/models/sent_emails.model";

export class EmailNodeExecutor extends AbstractNodeExecutor {
  private static sendCount = 0;
  private static lastReset = new Date();
  private static readonly MAX_PER_MINUTE = 60;
  private static readonly MAX_PER_DAY = 250;
  private static readonly MAX_RETRIES = 5;

  constructor(app: App, node: EmailCampaignNode) {
    super(app, node);
  }

  private async canSendEmail(): Promise<boolean> {
    const now = new Date();

    // Reset daily count if it's a new day
    if (now.getDate() !== EmailNodeExecutor.lastReset.getDate()) {
      EmailNodeExecutor.sendCount = 0;
      EmailNodeExecutor.lastReset = now;
    }

    // Check if we've hit our daily limit
    if (EmailNodeExecutor.sendCount >= EmailNodeExecutor.MAX_PER_DAY) {
      return false;
    }

    // Get count of emails sent in the last minute
    const oneMinuteAgo = moment().subtract(1, 'minute').toDate();
    const recentCount = await SentEmail.count({
      where: {
        createdAt: {
          [Op.gte]: oneMinuteAgo
        }
      }
    });

    return recentCount < EmailNodeExecutor.MAX_PER_MINUTE;
  }

  async execute(state: CampaignNodeState): Promise<ExecutionResult> {
    try {
      if (!await this.canSendEmail()) {
        // Check if we've exceeded retry attempts
        if (state.attempts >= EmailNodeExecutor.MAX_RETRIES) {
          logger.error(`Max retry attempts (${EmailNodeExecutor.MAX_RETRIES}) exceeded for email node ${this.node.getId()}`);
          return new ExecutionResult(ExecutionResultEnum.Error, 'Max retry attempts exceeded');
        }

        // Reschedule for later if we've hit rate limits
        const retryTime = new Date();
        retryTime.setMinutes(retryTime.getMinutes() + 1);
        await state.set({
          runAt: retryTime,
          attempts: state.attempts + 1
        }).save();
        return new ExecutionResult(ExecutionResultEnum.Reschedule);
      }

      logger.info(
        "[EmailNodeExecutor:execute] Executing campaign node state " + state.id
      );

      const productUser = await ProductUser.findOne({
        where: { id: state.productUserId }
      });

      if (!productUser) {
        logger.error(`Product user ${state.productUserId} not found`);
        return new ExecutionResult(ExecutionResultEnum.Error, 'Product user not found');
      }

      const email = await Email.findOne({
        where: { id: (this.node as EmailCampaignNode).getEmailId() }
      });

      if (!email) {
        logger.error(`Email template not found for node ${this.node.getId()}`);
        return new ExecutionResult(ExecutionResultEnum.Error, 'Email template not found');
      }

      const sendEmail = new SendEmail(this.app)
        .setEmail(email)
        .setProductUser(productUser);

      await sendEmail.send();

      // Increment send count
      EmailNodeExecutor.sendCount++;

      // Record the sent email
      await SentEmail.create({
        emailId: email.id,
        productUserId: productUser.id,
        deliveredAt: new Date(),
        deliveryStatus: 'SENT'
      });

      return new ExecutionResult(ExecutionResultEnum.Continue, sendEmail.getPayload());
    } catch (error) {
      logger.error('Error executing email node:', error);
      return new ExecutionResult(ExecutionResultEnum.Error, error.message);
    }
  }
}

export default EmailNodeExecutor;
