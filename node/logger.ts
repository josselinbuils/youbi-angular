import * as color from 'ansicolor';

enum LogLevel {
  Debug = 'DEBUG',
  Error = 'ERROR',
  Info = 'INFO',
}

export class Logger {

  private static colors = ['blue', 'magenta', 'cyan', 'yellow', 'lightGray', 'lightMagenta', 'lightCyan', 'lightYellow'];
  private static n = 0;

  color: string;

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

  constructor(private tag: string) {
    this.color = Logger.getInstanceColor();
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

  private write(level: LogLevel, args: any[]): void {
    const formattedTag = color[this.color](`[${this.tag}]`);
    const formattedLevel = color[Logger.getLogLevelColor(level)](`[${level}]`);
    args.unshift(formattedTag, formattedLevel);
    console.log.apply(console.log, args);
  }
}
