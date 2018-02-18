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

  isActive(): boolean {
    return this.asset !== undefined && this.asset.active;
  }

  async start(path: string): Promise<DecodingMetadata> {
    return new Promise<DecodingMetadata>((resolve, reject) => {

      if (this.isActive()) {
        throw new Error('Decoder active');
      }

      this.asset = Asset.fromFile(path);
      this.audioStream = through();

      // Needs to wait for decodeStart event to have asset.decoder defined
      this.asset.on('decodeStart', () => {
        this.asset.decoder.on('data', typedArray => {
          // Converts ArrayBuffer of input TypedArray to Buffer and writes the result into the output stream
          this.audioStream.write(Buffer.from(typedArray.buffer));
        });
      });

      this.asset.on('format', format => resolve({ audioStream: this.audioStream, format }));
      this.asset.on('error', reject);

      this.asset.start();
    });
  }

  stop(): void {
    logger.debug('Stops asset');

    if (!this.isActive()) {
      throw new Error('Decoder inactive');
    }

    this.asset.stop();
    this.audioStream.destroy();
  }
}

export interface DecodingFormat {
  formatID: string;
  sampleRate: number;
  channelsPerFrame: number;
  bitsPerChannel: number;
}

export interface DecodingMetadata {
  audioStream: Transform;
  format: DecodingFormat;
}
