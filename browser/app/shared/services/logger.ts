export class Logger {

  static create(tag: string): Logger {
    return new Logger(tag);
  }

  private constructor(private tag: string) {}

  debug(...attr: any[]): void {
    this.log('debug', attr);
  }

  error(...attr: any[]): void {
    this.log('error', attr);
  }

  info(...attr: any[]): void {
    this.log('info', attr);
  }

  private log(level: string, attr: any[]): void {
    console[level].apply(console, [`[${this.tag}]`, ...attr]);
  }
}
