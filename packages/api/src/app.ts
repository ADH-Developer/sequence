import dotenv from "dotenv";
dotenv.config();
import { register } from "./moduleAliases";
register();
import http from "http";
import express, { Application as ExpressApplication } from "express";
import cookieParser from "cookie-parser";
import { ApolloServer } from "apollo-server-express";
import { jwt as jwtAuth } from "src/auth/jwt.auth";
import cors from "cors";
import session from "express-session";
import enforce from "express-sslify";
import schema from "./graphql/schema";
import database from "./database";
import Models, { SequelizeModels } from "./models/index";
import Routes from "./routes";
import resolvers from "./graphql/resolvers";
import logger from "./utils/logger";
import { GraphQLError, GraphQLFormattedError } from "graphql";
import { CronService } from "./cron";
import QueueService, { QueueServiceOptions } from "./queue/queueService";
import { createNamespace, Namespace } from "continuation-local-storage";
import Repositories from "./repositories";
import EmailService from "./services/email/emailService";
import { SendEmail } from "./services/email/sendEmail";
import { EmailMonitoring } from "./services/email/emailMonitoring";
import SequenceError, { HTTP_UNAUTHORIZED } from "./error/sequenceError";
import { basicAuthentication } from "./auth/basic.auth";
import { GraphQLContextType } from "./graphql";
import depthLimit from "graphql-depth-limit";
import { getServers } from "dns";
import HttpRoutes from "./routes/index";

export interface AppOptions {
  port?: number;
  /**
   * Continuation local storage namespace identifier.
   */
  namespace?: string;
  /**
   * Queue options. Supply Redis options here
   */
  queue?: QueueServiceOptions;
  email?: {
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
  };
}

type ExpressHandler = {
  req: express.Request;
  res: express.Response;
};
type ContextFunction = {
  (context: ExpressHandler): Promise<GraphQLContextType>;
};

class App {
  expressApplication: ExpressApplication;
  apolloServer: ApolloServer;
  models: SequelizeModels;
  ns: Namespace;
  #server: http.Server;
  #cronService: CronService;
  #queueService: QueueService;
  repositories: Repositories;
  #emailService: EmailService;
  #port: number;
  constructor(options?: AppOptions) {
    this.ns = createNamespace(options?.namespace || "sequence");
    this.expressApplication = express();
    this.#port = options?.port || parseInt(process.env.PORT);
    this.configureExpress();
    this.models = Models;
    this.bootRepositories();
    this.bootRoutes();
    this.bootCron();
    this.bootApolloServer();
    // this.bootQueue(options?.queue);
    this.bootEmail(options?.email);
    // Initialize email throttler
    SendEmail.initializeThrottler(options?.email?.throttler);
    // Initialize email monitoring
    const monitoring = EmailMonitoring.getInstance({
      alertThresholds: {
        errorRate: options?.email?.monitoring?.alertThresholds?.errorRate ?? 5,
        queueSize: options?.email?.monitoring?.alertThresholds?.queueSize ?? 100,
        dropRate: options?.email?.monitoring?.alertThresholds?.dropRate ?? 10,
      },
      checkInterval: options?.email?.monitoring?.checkInterval ?? 60000,
    });
    monitoring.start();
    // @ts-ignore
    database.app = this;
  }
  /**
   * Formats the error returned via the API
   * @param error GraphQL Error
   * @returns
   */
  graphQLErrorFormatter(
    error: GraphQLError
  ): GraphQLFormattedError<Record<string, any>> {
    if (
      error.extensions?.exception?.statusCode >= 400 &&
      error.extensions?.exception?.statusCode < 500
    ) {
      return {
        message: error.message,
        locations: error.locations,
        path: error.path,
      };
    }
    // Unhandled server error occured
    logger.error(
      "[App:graphQLErrorFormatter] Error occured processing GraphQL request:",
      error
    );
    logger.error(error.extensions.exception);
    return {
      message: error.message,
      locations: error.locations,
      path: error.path,
      errors: error.originalError ? (error.originalError as any).errors : null,
    } as any;
  }
  /**
   * Executes a function wrapped in a Continuation Local Storage block.
   * Used to provide req/res global state.
   *
   * @param fn Function to execute
   */
  cls(fn: () => void): void {
    this.ns.run(() => {
      this.ns.set("app", this);
      fn();
    });
  }
  listen(): Promise<http.Server> {
    this.getExpressApplication().get("/", (req, res) =>
      res.json({ success: true })
    );
    return new Promise((resolve) => {
      this.#server = this.getExpressApplication().listen(this.#port, () => {
        console.log(`Sequence API listening on port ${this.#port}`);
        resolve(this.#server);
      });
    });
  }
  getServer(): http.Server {
    return this.#server;
  }
  getModels(): typeof Models {
    return Models;
  }
  async context(context: ExpressHandler) {
    const req = context.req;

    // Allow unauthenticated access to introspection queries
    if (req.body && (req.body.operationName === 'IntrospectionQuery' || req.path === '/login' || req.path === '/signup')) {
      return {
        models: Models,
        app: this,
        repositories: this.repositories,
        dataLoaders: {},
      };
    }

    const tokenHeader = req.headers.authorization;
    let user: any;

    if (!tokenHeader || tokenHeader.trim() === "") {
      throw new SequenceError(
        "Authentication not supported",
        HTTP_UNAUTHORIZED
      );
    } else if (tokenHeader.startsWith("Bearer")) {
      user = jwtAuth(tokenHeader, req);
    } else if (tokenHeader.startsWith("Basic")) {
      user = (await basicAuthentication(tokenHeader)).user;
    } else {
      throw new SequenceError(
        "Authentication not supported",
        HTTP_UNAUTHORIZED
      );
    }

    return {
      models: Models,
      user,
      app: this,
      repositories: this.repositories,
      dataLoaders: {},
    };
  }
  bootApolloServer() {
    this.expressApplication.use("/graphql", (req, res, next) => {
      this.cls(next);
    });

    this.apolloServer = new ApolloServer({
      typeDefs: schema,
      resolvers: resolvers,
      introspection: true,
      playground: true,
      context: this.context.bind(this),
      formatError: this.graphQLErrorFormatter,
      validationRules: [depthLimit(10)],
    });

    this.apolloServer.applyMiddleware({
      app: this.expressApplication,
      cors: {
        origin: [
          "https://my.sequence.so",
          "https://dev.sequence.so",
          process.env.NODE_ENV === "development" ? "http://localhost:8000" : null,
          process.env.NODE_ENV === "production" ? "http://192.168.1.100:8000" : null,
        ].filter(Boolean),
        credentials: true,
      },
    });
    return this.apolloServer;
  }
  configureExpress() {
    const app = this.expressApplication;
    app.disable("x-powered-by");

    if (process.env.USE_SSL) {
      app.use(enforce.HTTPS({ trustProtoHeader: true }));
    }

    // Configure CORS
    const corsOptions = {
      origin: [
        process.env.DASHBOARD_URL,
        process.env.NODE_ENV === "development" ? process.env.DEV_UI_URL : null,
        process.env.NODE_ENV === "development" ? process.env.DEV_API_URL : null,
        process.env.NODE_ENV === "production" ? process.env.PROD_UI_URL : null,
        process.env.NODE_ENV === "production" ? process.env.PROD_API_URL : null,
        "http://localhost:8000",
        "http://localhost:3000"
      ].filter(Boolean),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };

    app.use(cors(corsOptions));
    app.options("*", cors(corsOptions));

    // Configure body parsing
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Configure cookies and session
    app.use(cookieParser(process.env.JWT_SECRET_KEY));
    app.use(
      session({
        secret: process.env.ENCRYPTION_KEY,
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
      })
    );
  }
  close() {
    if (this.apolloServer) {
      this.apolloServer.stop();
    }
    if (this.#server) {
      this.#server.close();
    }
    database.close();
  }
  bootRoutes() {
    new HttpRoutes(this.expressApplication);
  }
  bootCron() {
    if (this.#cronService) {
      return this.#cronService;
    }
    return (this.#cronService = new CronService(this));
  }
  bootRepositories() {
    if (this.repositories) {
      return this.repositories;
    }
    return (this.repositories = new Repositories(this));
  }
  bootQueue(options?: QueueServiceOptions) {
    if (this.#queueService) {
      return this.#queueService;
    }
    return (this.#queueService = new QueueService(this, options));
  }
  bootEmail(options?: AppOptions["email"]) {
    if (this.#emailService) {
      return this.#emailService;
    }
    return (this.#emailService = new EmailService(this, options));
  }
  getCron() {
    return this.#cronService;
  }
  getQueue() {
    return this.#queueService;
  }
  getExpressApplication() {
    return this.expressApplication;
  }
  getRepositories() {
    return this.repositories;
  }
  getEmail() {
    return this.#emailService;
  }
}

export default App;
