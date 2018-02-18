import { Asset } from 'av';
import { Transform } from 'stream';
import * as through from 'through';

// Aurora codecs
// import'aac');
import 'alac';
import 'flac.js';
import 'mp3';

export class Decoder {
  static async decode(path: string): Promise<DecodingResult> {
    return new Promise<DecodingResult>((resolve, reject) => {
      const asset = Asset.fromFile(path);
      const audioStream = through();

      asset.on('error', reject);

      // Needs to wait for decodeStart event to have asset.decoder defined
      asset.on('decodeStart', () => {
        asset.decoder.on('data', typedArray => {
          // Converts ArrayBuffer of input TypedArray to Buffer and writes the result into the output stream
          audioStream.write(Buffer.from(typedArray.buffer));
        });
      });

      asset.on('format', format => {
        console.log(`Audio format: ${format.formatID.toUpperCase()} ${format.bitsPerChannel}bit/${format.sampleRate}KHz`);
        resolve({
          audioStream,
          bitDepth: format.bitsPerChannel,
          channels: format.channelsPerFrame,
          sampleRate: format.sampleRate,
        });
      });

      asset.start();
    });
  }
}

interface DecodingResult {
  audioStream: Transform;
  bitDepth: number;
  channels: number;
  sampleRate: number;
}
