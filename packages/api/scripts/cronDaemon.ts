import Application from "src/app";
import CampaignCronJob from "src/cron/jobs/campaignCronJob";
import CampaignNodeTimeoutJob from "src/cron/jobs/campaignNodeTimeoutCronJob";
import CronRunner from "src/cron/cronRunner";
import appConfig from "src/config/appConfig";
import { SendEmail } from "src/services/email/sendEmail";

const app = new Application(appConfig);
const runner = new CronRunner();
app.getCron().registerJobs(new CampaignCronJob(), new CampaignNodeTimeoutJob());

// Initialize email service and throttler
app.bootEmail(appConfig.email);
SendEmail.initializeThrottler(appConfig.email?.throttler);

runner.everyMinute(() => {
  app.getCron().tick();
});
