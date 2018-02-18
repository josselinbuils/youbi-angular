import { Asset } from 'av';
import { Transform } from 'stream';
import * as through from 'through';

// Aurora codecs
// import'aac');
import 'alac';
import 'flac.js';
import 'mp3';

import { Logger } from './logger';

const logger = Logger.create('Decoder');

export class Decoder {

  asset: Asset;
  audioStream: Transform;

  static create(): Decoder {
    return new Decoder();
  }

  async decode(path: string): Promise<DecodingResult> {
    return new Promise<DecodingResult>((resolve, reject) => {

      if (this.asset !== undefined) {
        logger.debug('Stop asset');
        this.asset.stop();
      }

      if (this.audioStream !== undefined) {
        logger.debug('Destroy audio stream');
        this.audioStream.destroy();
      }

      this.asset = Asset.fromFile(path);
      this.audioStream = through();

      this.asset.on('error', reject);

      // Needs to wait for decodeStart event to have asset.decoder defined
      this.asset.on('decodeStart', () => {
        this.asset.decoder.on('data', typedArray => {
          // Converts ArrayBuffer of input TypedArray to Buffer and writes the result into the output stream
          this.audioStream.write(Buffer.from(typedArray.buffer));
        });
      });

      this.asset.on('format', format => {
        logger.debug(`Audio format: ${format.formatID.toUpperCase()} ${format.bitsPerChannel}bit/${format.sampleRate}KHz`);
        resolve({
          audioStream: this.audioStream,
          bitDepth: format.bitsPerChannel,
          channels: format.channelsPerFrame,
          sampleRate: format.sampleRate,
        });
      });

      this.asset.start();
    });
  }
}

interface DecodingResult {
  audioStream: Transform;
  bitDepth: number;
  channels: number;
  sampleRate: number;
}
