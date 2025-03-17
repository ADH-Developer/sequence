import { Router, Request, Response } from "express";
import { getNamespace } from "continuation-local-storage";
import App from "src/app";
import SmtpEmailProvider from "src/services/email/providers/smtpEmailProvider";
import logger from "src/utils/logger";
import appConfig from "src/config/appConfig";

export const testRoutes = Router();

testRoutes.post("/email", async (req: Request, res: Response) => {
    try {
        const app = new App(appConfig);
        const emailProvider = app.getEmail().getProvider();

        if (!(emailProvider instanceof SmtpEmailProvider)) {
            return res.status(500).json({ error: "SMTP provider not configured" });
        }

        const { to, subject, text, html } = req.body;

        await emailProvider.send({
            to,
            subject,
            text,
            html: html || text
        });

        res.json({ success: true });
    } catch (error) {
        logger.error("Error sending test email:", error);
        res.status(500).json({ error: error.message });
    }
}); 