import schedule from "node-schedule";
import logger from "src/utils/logger";
const EVERY_MINUTE = "* * * * *";

class CronRunner {
  everyMinute(handler: () => void) {
    logger.info("[CronRunner:everyMinute] Starting a cron runner...");
    return schedule.scheduleJob(EVERY_MINUTE, handler);
  }
}

export default CronRunner;
