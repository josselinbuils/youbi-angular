import { pathExistsSync } from 'fs-extra';
import { AudioOutput, getDevices } from 'naudiodon';

import { PlayerState } from '../shared';

import { Decoder, DecodingFormat } from './decoder';
import { Logger } from './logger';

const logger = Logger.create('Player');

export class Player {

  private audioOutput: AudioOutput;
  private audioStream;
  private currentMusic?: { format: DecodingFormat; durationSeconds: number };
  private decoder = Decoder.create();
  private device: { id: number };

  static create(): Player {
    return new Player();
  }

  getState(): PlayerState {
    if (this.audioOutput === undefined) {
      return PlayerState.Stopped;
    } else if (this.audioOutput.isActive()) {
      return PlayerState.Playing;
    } else if (this.audioOutput.isStopped()) {
      return PlayerState.Paused;
    } else {
      return PlayerState.Stopped;
    }
  }

  pause(): PlayerState {
    if (this.getState() === PlayerState.Playing) {
      logger.info('Pause');
      try {
        this.audioOutput.stop();
      } catch (error) {
        logger.error(error);
      }
    }
    return this.getState();
  }

  async play(path: string): Promise<PlayerState> {
    logger.info(`Play ${path}`);

    if (!pathExistsSync(path)) {
      throw Error('File not found');
    }

    try {
      this.device = getDevices()
        .filter(d => /usb|dx7/i.test(d.name) && /wdm/i.test(d.hostAPIName))[0];

      this.stop();

      const format = await this.decoder.get('format', path) as DecodingFormat;
      const durationSeconds = Math.round((await this.decoder.get('duration', path) as number) / 1000);
      this.currentMusic = { durationSeconds, format };

      logger.debug(`Audio format: ${format.formatID.toUpperCase()} ${format.bitsPerChannel}bit/${format.sampleRate}Hz`);

      this.audioOutput = this.createAudioOutput(format, this.device.id);
      this.audioStream = await this.decoder.start(path);

      logger.debug('Links stream to audio output');
      this.audioStream.pipe(this.audioOutput);

      logger.debug('Starts audio output');
      this.audioOutput.start();

    } catch (error) {
      logger.error(error);
    }

    return this.getState();
  }

  resume(): PlayerState {
    if (this.getState() === PlayerState.Paused) {
      logger.info('Resume');
      try {
        this.audioOutput.start();
      } catch (error) {
        logger.error(error);
      }
    }
    return this.getState();
  }

  seek(timeSeconds: number): PlayerState {

    if (this.currentMusic === undefined) {
      throw new Error('No current music');
    }

    logger.info(`Seek to ${timeSeconds}s`);

    try {
      const format = this.currentMusic.format;
      const byteOffset = timeSeconds * format.sampleRate * format.bitsPerChannel * format.channelsPerFrame / 8;

      // this.audioStream.unpipe(this.audioOutput);
      // this.audioOutput.stop();
      this.audioStream = this.decoder.seek(byteOffset);
      this.audioOutput = this.createAudioOutput(format, this.device.id);
      logger.debug(`test: ${this.audioStream.length}`);
      this.audioStream.pipe(this.audioOutput);
      this.audioOutput.start();

    } catch (error) {
      logger.error(error);
    }

    return this.getState();
  }

  stop(): PlayerState {
    try {
      if (this.decoder.isActive()) {
        logger.debug('Decoder active, stops it');
        this.decoder.stop();
      }
      if (this.audioOutput !== undefined) {
        if (this.audioOutput.isActive()) {
          logger.debug('Audio output active, stops it');
          this.audioOutput.close();
        }
        delete this.audioOutput;
      }
    } catch (error) {
      logger.error(error);
    }
    return this.getState();
  }

  private constructor() {}

  private createAudioOutput(format: DecodingFormat, deviceId: number): AudioOutput {
    logger.debug(`Creates audio output on device ${deviceId}`);

    const audioOutput = new AudioOutput({
      channelCount: format.channelsPerFrame,
      sampleFormat: format.bitsPerChannel,
      sampleRate: format.sampleRate,
      deviceId: -1,
    });

    audioOutput.on('finish', () => logger.debug('Audio output stopped'));

    return audioOutput;
  }
}
