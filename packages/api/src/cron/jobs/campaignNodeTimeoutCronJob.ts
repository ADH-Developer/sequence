import CronJob from "../cronJob";
import logger from "src/utils/logger";
import { CampaignStateEnum } from "src/models/campaign.model";

class CampaignNodeTimeoutJob extends CronJob {
  name = "Campaign Node Timeout Job";

  async tick() {
    logger.info(`[${this.name}] Starting timeout check`);
    const repository = this.app.getRepositories().campaignNodeRepository;

    try {
      const timedOutNodes = await repository.getNextTimedOutCampaignNodeStates();

      for (const node of timedOutNodes) {
        await node
          .set({
            state: CampaignStateEnum.ERROR,
            completedAt: new Date(),
            didTimeout: true
          })
          .save();

        logger.info(`[${this.name}] Node ${node.id} marked as timed out`);
      }

      logger.info(`[${this.name}] Completed timeout check. Processed ${timedOutNodes.length} nodes`);
    } catch (error) {
      logger.error(`[${this.name}] Error processing timeouts: ${error.message}`);
      throw error;
    }
  }
}

export default CampaignNodeTimeoutJob;
