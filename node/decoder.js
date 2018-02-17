const {Asset} = require('av');
const {pathExistsSync} = require('fs-extra');
const {PassThrough} = require('stream');

// codecs
require('alac');

class Decoder {
  static async decode(path) {
    return new Promise((resolve, reject) => {

      if (!pathExistsSync(path)) {
        throw Error('File not found');
      }

      console.time('decoder: createAssetFromFile');
      const asset = Asset.fromFile(path);
      console.timeEnd('decoder: createAssetFromFile');

      asset.on('error', reject)

      console.log(asset.decoder);


      console.time('decoder: decode');
      asset.decodeToBuffer(float32Array => {
        console.timeEnd('decoder: decode');

        console.time('decoder: formatDecodedData');
        let int16Array = new Int16Array(float32Array.length);

        for (let i = 0; i < float32Array.length; i++) {
          if (float32Array[i] < 0) {
            int16Array[i] = 0x8000 * float32Array[i];
          } else {
            int16Array[i] = 0x7FFF * float32Array[i];
          }
        }

        const buffer = Buffer.from(int16Array.buffer);

        console.timeEnd('decoder: formatDecodedData');

        console.time('decoder: createStream');
        const stream = new PassThrough();
        stream.end(buffer);
        console.timeEnd('decoder: createStream');

        resolve({
          channels: asset.format.channelsPerFrame,
          sampleRate: asset.format.sampleRate,
          stream: stream
        });
      });
    });
  }
}

module.exports = {Decoder};
