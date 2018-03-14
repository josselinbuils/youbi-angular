import * as color from 'ansicolor';
import 'source-map-support/register';

const S_TO_MS = 1e3;
const NS_TO_MS = 1e-6;

enum LogLevel {
  Debug = 'DEBUG',
  Error = 'ERROR',
  Info = 'INFO',
}

export class Logger {

  private static colors = ['blue', 'magenta', 'cyan', 'yellow', 'lightGray', 'lightMagenta', 'lightCyan', 'lightYellow'];
  private static n = 0;

  color: string;

  private times = {};

  static create(tag: string): Logger {
    return new Logger(tag);
  }

  private static getInstanceColor(): string {
    return this.colors[this.n++];
  }

  private static getLogLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.Debug:
        return 'lightBlue';
      case LogLevel.Info:
        return 'green';
      case LogLevel.Error:
        return 'red';
    }
  }

  debug(...args: any[]): void {
    this.write(LogLevel.Debug, args);
  }

  info(...args: any[]): void {
    this.write(LogLevel.Info, args);
  }

  error(...args: any[]): void {
    this.write(LogLevel.Error, args);
  }

  time(tag: string = 'default'): void {
    this.times[tag] = this.now();
  }

  timeEnd(tag: string = 'default'): void {
    const startTime = this.times[tag];

    if (startTime === undefined) {
      throw new Error('Unknown tag');
    }

    delete this.times[tag];
    this.debug(`${tag}: ${Math.round((this.now() - startTime) * 100) / 100}ms`);
  }

  private constructor(private tag: string) {
    this.color = Logger.getInstanceColor();
  }

  private now(): number {
    const hrTime = process.hrtime();
    return hrTime[0] * S_TO_MS + hrTime[1] * NS_TO_MS;
  }

  private write(level: LogLevel, args: any[]): void {
    const formattedTag = color[this.color](`[${this.tag}]`);
    const formattedLevel = color[Logger.getLogLevelColor(level)](`[${level}]`);
    args.unshift(formattedTag, formattedLevel);
    console.log.apply(console.log, args);
  }
}
