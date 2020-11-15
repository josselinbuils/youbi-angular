import { environment } from '../../../environments/environment';

export class Logger {
  private times = {};

  static create(tag: string): Logger {
    return new Logger(tag);
  }

  private constructor(private tag: string) {}

  debug(...attr: any[]): void {
    if (!environment.production) {
      this.log('debug', attr);
    }
  }

  error(...attr: any[]): void {
    this.log('error', attr);
  }

  info(...attr: any[]): void {
    this.log('info', attr);
  }

  time(tag: string = 'default'): void {
    this.times[tag] = performance.now();
  }

  timeEnd(tag: string = 'default'): void {
    const startTime = this.times[tag];

    if (startTime === undefined) {
      throw new Error('Unknown tag');
    }

    delete this.times[tag];
    this.debug(
      `${tag}: ${Math.round((performance.now() - startTime) * 100) / 100}ms`
    );
  }

  private log(level: string, attr: any[]): void {
    console[level].apply(console, [`[${this.tag}]`, ...attr]);
  }
}
