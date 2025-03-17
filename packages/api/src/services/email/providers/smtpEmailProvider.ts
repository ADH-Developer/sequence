import { AppOptions } from "src/app";
import AbstractEmailProvider, { SendEmailPayload } from "./abstractEmailProvider";
import invariant from "invariant";
import nodemailer from "nodemailer";
import logger from "src/utils/logger";
import SequenceError from "src/error/sequenceError";

type SmtpOptions = {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
    fromAddress: string;
};

class SmtpEmailProvider extends AbstractEmailProvider {
    private transporter: nodemailer.Transporter;
    private options: SmtpOptions;

    constructor(options: SmtpOptions) {
        super();
        this.options = options;
        invariant(options.host, "SMTP host must be provided");
        invariant(options.port, "SMTP port must be provided");
        invariant(options.auth.user, "SMTP username must be provided");
        invariant(options.auth.pass, "SMTP password must be provided");
        invariant(options.fromAddress, "From address must be provided");

        this.transporter = nodemailer.createTransport({
            host: options.host,
            port: options.port,
            secure: options.secure,
            auth: {
                user: options.auth.user,
                pass: options.auth.pass,
            },
        });
    }

    async send(payload: SendEmailPayload) {
        try {
            return await this.transporter.sendMail({
                from: this.options.fromAddress,
                to: payload.to,
                subject: payload.subject,
                text: payload.text,
                html: payload.html,
            });
        } catch (error) {
            logger.error("[SmtpEmailProvider:send] " + error);
            const sequenceError = new SequenceError(
                "Could not send email via SMTP",
                500
            );
            sequenceError.errors = [error];
            throw sequenceError;
        }
    }
}

export default SmtpEmailProvider; 