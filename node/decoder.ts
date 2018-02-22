import { Asset } from 'av';
import { Transform } from 'stream';
import * as through from 'through2';

// Aurora codecs
// import 'aac';
import 'alac';
import 'flac.js';
import 'mp3';
import 'ogg.js';
import 'vorbis.js';

import { Logger } from './logger';

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

  seek(byteOffset: number): Transform {
    if (this.asset !== undefined && this.asset.decoder !== undefined) {
      logger.debug(`Seek to byte offset ${byteOffset}`);

      const buffer = Buffer
        .concat(this.bufferList)
        .slice(byteOffset);

      const stream = through();
      stream.write(buffer);
      this.audioStream = stream;

      return stream;
    }
  }

  start(path: string): Promise<Transform> {
    return new Promise<Transform>(resolve => {

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

    logger.debug('Stops decoding');
    this.asset.stop();
    this.audioStream.destroy();
    logger.debug('Decoder stopped');
  }
}

export interface DecodingFormat {
  formatID: string;
  sampleRate: number;
  channelsPerFrame: number;
  bitsPerChannel: number;
}
