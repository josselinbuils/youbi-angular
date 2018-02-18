import { pathExistsSync } from 'fs-extra';
import { AudioOutput, getDevices } from 'naudiodon';

import { Decoder, DecodingFormat } from './decoder';
import { Logger } from './logger';

const logger = Logger.create('Player');

export class Player {

  private audioOutput: AudioOutput;
  private audioStream;
  private decoder = Decoder.create();
  private state: PlayerState = PlayerState.Stopped;

  static create(): Player {
    return new Player();
  }

  async play(path: string): Promise<void> {
    logger.info(`Play ${path}`);

    if (!pathExistsSync(path)) {
      throw Error('File not found');
    }

    // const devices = getDevices()
    //   .map(d => `- ${d.name} (${d.hostAPIName})`)
    //   .join('\n');

    // logger.debug(`Available devices:\n${devices}\n`);

    const device = getDevices()
      .filter(d => /usb|dx7/i.test(d.name) && /wdm/i.test(d.hostAPIName))[0];

    if (this.decoder.isActive()) {
      logger.debug('Decoder active, stops it');
      this.decoder.stop();

      logger.debug('Stops audio output');
      await this.audioOutput.stop();
    }

    console.time('decode');
    const { audioStream, format } = await this.decoder.start(path);
    console.timeEnd('decode');

    logger.debug(`Audio format: ${format.formatID.toUpperCase()} ${format.bitsPerChannel}bit/${format.sampleRate}KHz`);

    this.audioStream = audioStream;

    // logger.debug('Stops audio output if active');
    // await this.stopAudioOutput();

    logger.debug('Starts a new audio output');
    this.startAudioOutput(format, device.id);

    this.state = PlayerState.Playing;
  }

  private startAudioOutput(format: DecodingFormat, deviceId: number): void {
    logger.debug(`Creates audio output on device ${deviceId}`);

    this.audioOutput = new AudioOutput({
      channelCount: format.channelsPerFrame,
      sampleFormat: format.bitsPerChannel,
      sampleRate: format.sampleRate,
      deviceId,
    });

    this.audioOutput.on('stopped', () => {
      logger.debug('Audio output stopped');
      this.state = PlayerState.Stopped;
    });

    logger.debug('Links stream to audio output');
    this.audioStream.pipe(this.audioOutput);

    logger.debug('Starts audio output');
    this.audioOutput.start();
  }
}

enum PlayerState {
  Paused,
  Playing,
  Stopped,
}
