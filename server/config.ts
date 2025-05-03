import path, { dirname } from "path";
import { fileURLToPath } from "url";
import logger from "./utils/logger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type Config = {
  port: number;
  databaseUrl: string;
  environment: string;
  corsOrigin: string | string[];
  sessionSecret: string;
  uploadDir: string;
  publicDir: string;
  baseUrl: string;
};

// Log environment variables for debugging
logger.info('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL ? '[REDACTED]' : 'Not set',
  CORS_ORIGIN: process.env.CORS_ORIGIN,
});

const config: Config = {
  port: parseInt(process.env.PORT || "5001"), 
  databaseUrl: process.env.DATABASE_URL || "postgresql://localhost:5432/property_manager",
  environment: process.env.NODE_ENV || "development",
  corsOrigin: "*", // Allow all origins in development
  sessionSecret: process.env.SESSION_SECRET || "your-secret-key",
  uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"),
  publicDir: process.env.PUBLIC_DIR || path.join(process.cwd(), "dist/public"),
  baseUrl: process.env.BASE_URL || "http://localhost:5001"
};

// Log the configuration (without sensitive data)
logger.info('Application configuration:', {
  port: config.port,
  environment: config.environment,
  corsOrigin: config.corsOrigin,
  uploadDir: config.uploadDir,
  publicDir: config.publicDir,
  baseUrl: config.baseUrl,
});

export default config;