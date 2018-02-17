const {Asset} = require('av');
const {pathExistsSync} = require('fs-extra');
const through = require('through');

// Aurora codecs
require('mp3');
// require('aac');
require('alac');
require('flac.js');

class Decoder {
  static async decode(path) {
    return new Promise((resolve, reject) => {

      if (!pathExistsSync(path)) {
        throw Error('File not found');
      }

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
          bits: format.bitsPerChannel,
          channels: format.channelsPerFrame,
          sampleRate: format.sampleRate,
        });
      });

      asset.start();
    });
  }
}

module.exports = {Decoder};
