import { Sequelize, SequelizeOptions } from "sequelize-typescript";
import SequelizeConfig from "./config/config";

declare type ENVIRONMENT = "test" | "development" | "production";

const options: SequelizeOptions = {
  dialectOptions: process.env.DB_SSL === "true"
    ? {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    }
    : undefined,
  logging: process.env.DB_LOGGING === "true" ? console.log : false,
};

const config = {
  url: process.env.DB_URL,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  dialect: "postgres",
  ...options
};

export const dbConfig = config;

const createSequelize = (...args: any[]) => {
  const instance = new Sequelize(...args);
  instance
    .authenticate()
    .then(() => console.log("Sequence: database connection successful"))
    .catch((error) => {
      console.error("Failed to connect to database:", error.message);
    });
  return instance;
};

let sequelize: Sequelize;
if (config.url) {
  sequelize = createSequelize(config.url, { ...config, ...options });
} else {
  sequelize = createSequelize({ ...config, ...options });
}

export default sequelize;
