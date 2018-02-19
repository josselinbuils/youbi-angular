import { Asset } from 'av';
import { Transform } from 'stream';
import * as through from 'through';

// Aurora codecs
import 'aac';
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

  static create(): Decoder {
    return new Decoder();
  }

  async getFormat(path: string): Promise<DecodingFormat> {
    return new Promise<DecodingFormat>((resolve, reject) => {
      logger.debug(`Gets format of ${path}`);
      this.asset = Asset.fromFile(path);
      this.asset.get('format', resolve);
      this.asset.on('error', reject);
    });
  }

  isActive(): boolean {
    return this.asset !== undefined && this.asset.active;
  }

  start(path: string): Transform {

    if (this.isActive()) {
      throw new Error('Decoder active');
    }

    logger.debug(`Starts decoding ${path}`);

    this.asset = Asset.fromFile(path);
    this.audioStream = through();

    // Needs to wait for decodeStart event to have asset.decoder defined
    this.asset.on('decodeStart', () => {
      this.asset.decoder.on('data', typedArray => {
        // Converts ArrayBuffer of input TypedArray to Buffer and writes the result into the output stream
        this.audioStream.write(Buffer.from(typedArray.buffer));
      });
    });

    this.asset.on('error', error => { throw error; });

    this.asset.start();

    return this.audioStream;
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
