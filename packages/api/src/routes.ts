import { Application } from "express";
import passport from "passport";
import { authRoutes } from "./routes/auth.routes";
import { webhookRoutes } from "./routes/webhook.routes";
import { testRoutes } from "./routes/test.routes";

class Routes {
    constructor(app: Application) {
        app.use(passport.initialize());
        app.use("/auth", authRoutes);
        app.use("/webhooks", webhookRoutes);
        app.use("/test", testRoutes);
    }
}

export default Routes; 