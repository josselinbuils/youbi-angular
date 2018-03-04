import { ChildProcess, fork } from 'child_process';
import { Readable, Transform } from 'stream';
import * as through from 'through2';

import { Command } from '../shared/interfaces';
import { delay } from '../shared/utils';

import { Logger } from './logger';
import { EventStatus, WorkerEvent } from './worker-event';

const SEEK_TIMEOUT_MS = 5000;

export class Decoder {

  audioStream: Transform;
  bufferList: Buffer[];

  private decodingWorker: ChildProcess;

  static create(): Decoder {
    return new Decoder(Logger.create('Decoder'), Logger.create('DecodingWorker'));
  }

  async get(event: string, path: string): Promise<any> {
    return this.execInWorker('get', [event, path]);
  }

  async isActive(): Promise<boolean> {
    return this.decodingWorker !== undefined && (await this.execInWorker('isActive')) === true;
  }

  async seek(byteOffset: number): Promise<Readable> {
    this.logger.debug('seek():', byteOffset);

    if (await this.execInWorker('hasDecoder')) {
      const startTime = Date.now();
      let buffer = Buffer.concat(this.bufferList);

      while (buffer.length < byteOffset) {
        if ((Date.now() - startTime) > SEEK_TIMEOUT_MS) {
          throw new Error('Seek timeout reached');
        }
        await delay(100);
        buffer = Buffer.concat(this.bufferList);
      }

      const stream = through();
      stream.write(buffer.slice(byteOffset));
      this.audioStream.destroy();
      this.audioStream = stream;

      return stream;
    }
  }

  async start(path: string): Promise<Readable> {
    this.logger.debug('start():', path);

    if (await this.isActive()) {
      throw new Error('Decoder active');
    }

    try {
      this.audioStream = through();
      this.bufferList = [];

      this.decodingWorker.stdout.on('data', (buffer: Buffer) => {
        this.bufferList.push(buffer);
        this.audioStream.write(buffer);
      });

    } catch (error) {
      this.logger.error(error);
    }

    await this.execInWorker('start', [path]);
    return this.audioStream;
  }

  async stop(): Promise<void> {
    this.logger.debug('stop()');

    if (!(await this.isActive())) {
      throw new Error('Decoder inactive');
    }

    this.replaceWorker();
    this.audioStream.destroy();
    this.bufferList = [];
  }

  private constructor(private logger: Logger,
                      private workerLogger: Logger) {
    logger.debug('constructor()');
    this.decodingWorker = this.createWorker();
  }

  private createWorker(): ChildProcess {
    this.logger.debug('createWorker()');

    const decodingWorker = fork('./dist/node/decoding-worker.js', [], { stdio: ['ipc', 'pipe', 2] });

    decodingWorker.on('message', event => {
      if (event.name === 'debug') {
        this.workerLogger.debug(event.data);
      }
    });

    return decodingWorker;
  }

  private async execInWorker(commandName: string, args?: any[]): Promise<any> {
    return new Promise<any>(resolve => {
      const listener = (event: WorkerEvent) => {
        const { data, name, status } = event;

        if (name === 'result') {
          this.decodingWorker.removeListener('message', listener);

          if (status === EventStatus.Success) {
            resolve(data);
          } else {
            throw new Error(data);
          }
        }
      };
      this.decodingWorker.addListener('message', listener);
      const command: Command = { name: commandName, args };
      this.decodingWorker.send(command);
    });
  }

  private replaceWorker(): void {
    this.logger.debug('replaceWorker()');
    this.decodingWorker.kill();
    this.decodingWorker = this.createWorker();
  }
}

export interface DecodingFormat {
  formatID: string;
  sampleRate: number;
  channelsPerFrame: number;
  bitsPerChannel: number;
}
