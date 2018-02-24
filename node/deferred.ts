export class Deferred {
  promise: Promise<any>;

  static create(): Deferred {
    return new Deferred();
  }

  resolve: () => void = () => {};
  reject: () => void = () => {};

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}
