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

    await this.stop();

    const format = await this.decoder.getFormat(path);
    logger.debug(`Audio format: ${format.formatID.toUpperCase()} ${format.bitsPerChannel}bit/${format.sampleRate}KHz`);

    this.startAudioOutput(format, device.id);

    this.audioStream = this.decoder.start(path);

    logger.debug('Links stream to audio output');
    this.audioStream.pipe(this.audioOutput);

    this.state = PlayerState.Playing;
  }

  async stop(): Promise<void> {
    if (this.decoder.isActive()) {
      logger.debug('Decoder active, stops it');
      this.decoder.stop();
    }
    if (this.audioOutput !== undefined && this.audioOutput.isActive()) {
      logger.debug('Audio output active, stops it');
      await this.audioOutput.stop();
    }
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

    logger.debug('Starts audio output');
    this.audioOutput.start();
  }
}

enum PlayerState {
  Paused,
  Playing,
  Stopped,
}
