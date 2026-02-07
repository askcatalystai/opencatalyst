import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Create a logger instance with the given name
 */
export function createLogger(name: string) {
  return pino({
    name: `catalyst:${name}`,
    level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
    transport: isProduction
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
  });
}

/**
 * Default logger instance
 */
export const logger = createLogger("main");
