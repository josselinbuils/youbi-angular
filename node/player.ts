import { pathExistsSync } from 'fs-extra';
import { AudioOutput, getDevices, SampleFormat16Bit, SampleFormat24Bit } from 'naudiodon';

import { Decoder } from './decoder';
import { Logger } from './logger';

const logger = Logger.create('Player');

export class Player {

  private audioOutput: AudioOutput;
  private decoder = Decoder.create();

  static create(): Player {
    return new Player();
  }

  async play(path: string): Promise<void> {
    logger.info(`Play ${path}`);

    if (!pathExistsSync(path)) {
      throw Error('File not found');
    }

    const devices = getDevices()
      .map(d => `- ${d.name} (${d.hostAPIName})`)
      .join('\n');

    logger.debug(`Available devices:\n${devices}\n`);

    const device = getDevices()
      .filter(d => /usb|dx7/i.test(d.name) && /wdm/i.test(d.hostAPIName))[0];

    console.time('decode');
    const decoded = await this.decoder.decode(path);
    console.timeEnd('decode');

    const endAudioOutput = () => logger.debug('Ends audio output') && this.audioOutput.end();
    decoded.audioStream.on('end', () => logger.debug('"end" event received from audio stream') && endAudioOutput());
    decoded.audioStream.on('close', () => logger.debug('"close" event received from audio stream') && endAudioOutput());

    const options = {
      channelCount: decoded.channels,
      sampleFormat: this.getSampleFormat(decoded.bitDepth),
      sampleRate: decoded.sampleRate,
      deviceId: device.id,
    };

    await new Promise(resolve => setTimeout(resolve, 5000));
    logger.debug('Creates audio output with options:', options);
    this.audioOutput = new AudioOutput(options);

    logger.debug('Links stream to audio output');
    decoded.audioStream.pipe(this.audioOutput);

    logger.debug('Starts audio output');
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
