import 'source-map-support/register';

export class Deferred {
  promise: Promise<any>;

  static create(): Deferred {
    return new Deferred();
  }

  resolve: (...args: any[]) => void = () => {};
  reject: (...args: any[]) => void = () => {};

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}
