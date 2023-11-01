import { prisma } from "./prisma";

export const LoggerType = {
  INFO: "INFO",
  ERROR: "ERROR",
} as const;

export type LoggerType = (typeof LoggerType)[keyof typeof LoggerType];

export class Logger {
  static async info(message: string) {
    await prisma.executionLogs.create({
      data: { type: LoggerType.INFO, message },
    });
  }

  static async error(message: string) {
    await prisma.executionLogs.create({
      data: { type: LoggerType.ERROR, message },
    });
  }
}
