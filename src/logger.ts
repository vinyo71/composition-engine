export type LogLevel = "quiet" | "info" | "debug" | "warn";

const LOG_LEVELS: Record<LogLevel, number> = { quiet: 0, info: 1, warn: 1, debug: 2 };

export class Logger {
  level: number;
  constructor(logLevel: LogLevel) {
    this.level = LOG_LEVELS[logLevel];
  }
  info(...args: any[]) {
    if (this.level >= LOG_LEVELS.info) console.log(...args);
  }
  warn(...args: any[]) {
    if (this.level >= LOG_LEVELS.info) console.warn(...args);
  }
  debug(...args: any[]) {
    if (this.level >= LOG_LEVELS.debug) console.debug(...args);
  }
  error(...args: any[]) {
    console.error(...args);
  }
}
