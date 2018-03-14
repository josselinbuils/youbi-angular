import 'source-map-support/register';

import { Deferred } from './deferred';
import { Logger } from './logger';

const logger = Logger.create('PromiseQueue');

export class PromiseQueue {
  private pool: Promise<any>[] = [];
  private queue: QueueElement[] = [];

  static create(maxConcurrent: number): PromiseQueue {
    return new PromiseQueue(maxConcurrent);
  }

  async enqueue(handler: () => Promise<any>): Promise<any> {
    const deferred = Deferred.create();
    const element = { deferred, handler };

    if (this.pool.length < this.maxConcurrent) {
      this.exec(element);
    } else {
      this.queue.push(element);
    }

    return deferred.promise;
  }

  private dequeue(): void {
    if (this.queue.length > 0) {
      this.exec(this.queue.shift());
    }
  }

  private exec(element: QueueElement): void {
    try {
      const promise = element.handler()
        .then(element.deferred.resolve)
        .catch(element.deferred.reject)
        .then(() => this.pool.splice(this.pool.indexOf(promise), 1))
        .then(() => this.dequeue());

      this.pool.push(promise);

    } catch (error) {
      logger.error(error);
    }
  }

  private constructor(private maxConcurrent: number) {}
}

interface QueueElement {
  deferred: Deferred;

  handler(): Promise<any>;
}
