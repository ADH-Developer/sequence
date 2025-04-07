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

class EmailNodeExecutor extends AbstractNodeExecutor<any> {
  node: EmailCampaignNode;
  constructor(app: App, node: EmailCampaignNode) {
    super(app, node);
  }
  async execute(state: CampaignNodeState) {
    logger.info(
      `[EmailNodeExecutor:execute] Starting execution for campaign node state ${state.id}`
    );
    logger.info(
      `[EmailNodeExecutor:execute] Parameters - productUserId: ${state.productUserId}, userId: ${state.userId}, emailId: ${this.node.getEmailId()}`
    );

    const productUserId = state.productUserId;
    const userId = state.userId;
    let emailModel: Email;
    let productUser: ProductUser;

    logger.info(`[EmailNodeExecutor:execute] Fetching product user with id: ${productUserId}`);
    productUser = await this.app.models.ProductUser.findOne({
      where: {
        id: productUserId,
      },
    });

    if (!productUser) {
      const errorMsg = `[EmailNodeExecutor:execute] FATAL: Could not find product user for id: ${productUserId}`;
      logger.error(errorMsg);
      throw new CampaignNodeExecutionError("ProductUser not found");
    }
    logger.info(`[EmailNodeExecutor:execute] Found product user: ${productUser.email}`);

    logger.info(`[EmailNodeExecutor:execute] Fetching email model with id: ${this.node.getEmailId()}`);
    emailModel = await this.app.models.Email.findOne({
      where: {
        userId: userId,
        id: this.node.getEmailId(),
      },
    });

    if (!emailModel) {
      const errorMsg = `[EmailNodeExecutor:execute] FATAL: Could not find emailModel for id: ${this.node.getEmailId()}`;
      logger.error(errorMsg);
      throw new CampaignNodeExecutionError("Email not found");
    }
    logger.info(`[EmailNodeExecutor:execute] Found email model with subject: ${emailModel.subject}`);

    logger.info("[EmailNodeExecutor:execute] Initializing SendEmail service");
    const sendEmail = new SendEmail();
    sendEmail
      .setProvider(this.app.getEmail().getProvider())
      .setEmail(emailModel)
      .setProductUser(productUser);

    try {
      logger.info("[EmailNodeExecutor:execute] Preparing email payload");
      const payload = sendEmail.getPayload();
      logger.info(`[EmailNodeExecutor:execute] Email payload prepared - To: ${payload.to}, Subject: ${payload.subject}`);

      logger.info("[EmailNodeExecutor:execute] Attempting to send email");
      await sendEmail.send();
      logger.info(`[EmailNodeExecutor:execute] Successfully sent email to ${productUser.email}`);
    } catch (error) {
      const errorMsg = `[EmailNodeExecutor:execute] Error sending email ${this.node.getEmailId()} for node state: ${state.id}`;
      logger.error(errorMsg);
      logger.error("[EmailNodeExecutor:execute] Error details:", error);
      if (error.response) {
        logger.error("[EmailNodeExecutor:execute] Provider response:", error.response);
      }
      throw new CampaignNodeExecutionError("Could not send the email");
    }

    logger.info("[EmailNodeExecutor:execute] Email node execution completed successfully");
    return new ExecutionResult(
      ExecutionResultEnum.Continue,
      sendEmail.getPayload()
    );
  }
}

export default EmailNodeExecutor;
