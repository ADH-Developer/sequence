import { Application } from "express";
import PassportRoutes from "./passport.http";
import SegmentHttpHandler from "./segment.http";
import SequenceHttpHandler from "./sequence.http";
import MiddlewareRegistry from "../services/middleware.registry";

class HttpRoutes {
  constructor(app: Application) {
    // Initialize passport routes first
    new PassportRoutes(app);

    // Then add other middleware
    MiddlewareRegistry.addMiddleware(new SegmentHttpHandler(app));
    MiddlewareRegistry.addMiddleware(new SequenceHttpHandler(app));
  }
}

export default HttpRoutes;
