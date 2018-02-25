import { Asset } from 'av';
import { Readable, Transform } from 'stream';
import * as through from 'through2';

// Aurora codecs
// import 'aac';
import 'alac';
import 'flac.js';
import 'mp3';
import 'ogg.js';
import 'vorbis.js';

import { delay } from '../shared';

import { Logger } from './logger';

const SEEK_TIMEOUT_MS = 5000;

const logger = Logger.create('Decoder');

export class Decoder {

  asset: Asset;
  audioStream: Transform;
  bufferList: Buffer[];

  static create(): Decoder {
    return new Decoder();
  }

  async get(event: string, path: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      logger.debug(`Gets ${event} of ${path}`);
      this.asset = Asset.fromFile(path);
      this.asset.get(event, resolve);
      this.asset.on('error', reject);
    });
  }

  isActive(): boolean {
    return this.asset !== undefined && this.asset.active;
  }

  async seek(byteOffset: number): Promise<Readable> {
    if (this.asset !== undefined && this.asset.decoder !== undefined) {
      logger.debug(`Seek to byte offset ${byteOffset}`);

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
    return new Promise<Readable>(resolve => {

      if (this.isActive()) {
        throw new Error('Decoder active');
      }

      logger.debug(`Starts decoding ${path}`);

      this.asset = Asset.fromFile(path);
      this.audioStream = through();
      this.bufferList = [];

      // Needs to wait for decodeStart event to have asset.decoder defined
      this.asset.on('decodeStart', () => {
        this.asset.decoder.on('data', typedArray => {
          // Converts ArrayBuffer of input TypedArray to Buffer and writes the result into the output stream
          const buffer = Buffer.from(typedArray.buffer);
          this.bufferList.push(buffer);
          this.audioStream.write(buffer);
        });
        resolve(this.audioStream);
      });

      let lastStep = 0;

      this.asset.on('buffer', progress => {
        const step = Math.round(progress / 10);

        if (step > lastStep || progress === 100) {
          lastStep = step;
          logger.debug(`Decoded ${Math.round(progress)}%`);
        }
      });

      this.asset.on('error', error => { throw error; });

      this.asset.start();
    });
  }

  stop(): void {

    if (!this.isActive()) {
      throw new Error('Decoder inactive');
    }

    logger.debug('Stops decoder');
    this.asset.stop();
    this.audioStream.destroy();
    this.bufferList = [];
  }

  private constructor() {}
}

export interface DecodingFormat {
  formatID: string;
  sampleRate: number;
  channelsPerFrame: number;
  bitsPerChannel: number;
}
