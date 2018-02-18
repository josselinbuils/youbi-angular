import { pathExistsSync } from 'fs-extra';
import { AudioOutput, getDevices, SampleFormat16Bit, SampleFormat24Bit } from 'naudiodon';

import { Decoder } from './decoder';

export class Player {

  private audioOutput: AudioOutput;

  static create(): Player {
    return new Player();
  }

  async play(path: string): Promise<void> {
    console.log(`Play ${path}`, this);

    if (!pathExistsSync(path)) {
      throw Error('File not found');
    }

    const devices = getDevices()
      .map(d => `- ${d.name} (${d.hostAPIName})`)
      .join('\n');

    console.log(`Available devices:\n${devices}\n`);

    const device = getDevices()
      .filter(d => /usb|dx7/i.test(d.name) && /wdm/i.test(d.hostAPIName))[0];

    console.time('decode');
    const decoded = await Decoder.decode(path);
    console.timeEnd('decode');

    if (this.audioOutput !== undefined) {
      this.audioOutput.end();
    }

    this.audioOutput = new AudioOutput({
      channelCount: decoded.channels,
      sampleFormat: this.getSampleFormat(decoded.bitDepth),
      sampleRate: decoded.sampleRate,
      deviceId: device.id,
    });

    decoded.audioStream.pipe(this.audioOutput);
    this.audioOutput.start();
  }

  private getSampleFormat(bitDepth: number): number {
    switch (bitDepth) {
      case 16:
        return SampleFormat16Bit;
      case 24:
        return SampleFormat24Bit;
      default:
        throw new Error('Invalid bit depth');
    }
  }
}
