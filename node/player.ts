import { pathExistsSync } from 'fs-extra';
import { AudioOutput, getDevices } from 'naudiodon';
import { Readable } from 'stream';

import { delay, PlayerState } from '../shared';

import { Decoder, DecodingFormat } from './decoder';
import { Logger } from './logger';

const AUDIO_OUTPUT_RETRIES = 2;

const logger = Logger.create('Player');

export class Player {

  private audioOutput: AudioOutput;
  private audioStream;
  private currentMusic?: { format: DecodingFormat };
  private decoder = Decoder.create();
  private device: { id: number };

  static create(): Player {
    return new Player();
  }

  getState(): PlayerState {
    try {
      if (this.audioOutput !== undefined) {
        if (this.audioOutput.isActive()) {
          return PlayerState.Playing;
        }
        if (this.decoder.isActive() && this.audioOutput.isStopped()) {
          return PlayerState.Paused;
        }
      }
      return PlayerState.Stopped;

    } catch (error) {
      logger.error(`Unable to retrieve player state: ${error.message}`);
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
      this.currentMusic = { format };

      logger.debug(`Audio format: ${format.formatID.toUpperCase()} ${format.bitsPerChannel}bit/${format.sampleRate}Hz`);

      this.audioOutput = this.getAudioOutput(format, this.device.id);
      this.setAudioStream(await this.decoder.start(path));
      // Delay needed to fill enough the audio stream before starting reading it, check should be done by the lib
      await delay(1);
      this.audioOutput.start();

    } catch (error) {
      logger.error(`Unable to play: ${error.message}`);
    }

    return this.getState();
  }

  resume(): PlayerState {
    if (this.getState() === PlayerState.Paused) {
      logger.info('Resume');
      try {
        this.audioOutput.start();
      } catch (error) {
        logger.error(`Unable to resume: ${error.message}`);
        logger.error(error);
      }
    }
    return this.getState();
  }

  async seek(timeSeconds: number): Promise<PlayerState> {

    if (this.currentMusic === undefined) {
      throw new Error('No current music');
    }

    logger.info(`Seek to ${timeSeconds}s`);
    try {
      const format = this.currentMusic.format;
      const byteOffset = timeSeconds * format.sampleRate * format.bitsPerChannel * format.channelsPerFrame / 8;
      this.setAudioStream(await this.decoder.seek(byteOffset));
    } catch (error) {
      logger.error(`Unable to seek: ${error.message}`);
    }

    return this.getState();
  }

  stop(): PlayerState {
    try {
      if (this.decoder.isActive()) {
        logger.debug('Decoder active, stops it');
        this.decoder.stop();
      }
      if (this.audioOutput !== undefined && this.audioOutput.isActive()) {
        logger.debug('Audio output active, stops it');
        this.audioOutput.stop();
      }
    } catch (error) {
      logger.error(`Unable to stop: ${error.message}`);
    }
    return this.getState();
  }

  private constructor() {}

  private getAudioOutput(format: DecodingFormat, deviceId: number, retries: number = AUDIO_OUTPUT_RETRIES): AudioOutput {
    // deviceId = -1;

    const options = {
      channelCount: format.channelsPerFrame,
      sampleFormat: format.bitsPerChannel,
      sampleRate: format.sampleRate,
      deviceId,
    };

    if (this.audioOutput !== undefined) {
      if (JSON.stringify(options) === JSON.stringify(this.audioOutput.options)) {
        logger.debug('Uses existing audio output');
        return this.audioOutput;
      } else {
        logger.debug('Closes existing audio output');
        this.audioOutput.close();
        delete this.audioOutput;
      }
    }

    let audioOutput: AudioOutput;
    try {
      logger.debug(`Creates audio output on device ${deviceId}`);

      audioOutput = new AudioOutput({
        channelCount: format.channelsPerFrame,
        sampleFormat: format.bitsPerChannel,
        sampleRate: format.sampleRate,
        deviceId,
      });

      audioOutput.on('finish', () => logger.debug('Audio output stopped'));
      return audioOutput;

    } catch (error) {
      logger.error(`Unable to create audio output: ${error.message}`);

      if (retries > 0) {
        logger.debug(`Retry ${ AUDIO_OUTPUT_RETRIES - retries + 1}/${AUDIO_OUTPUT_RETRIES}`);
        return this.getAudioOutput(format, deviceId, retries - 1);
      } else {
        throw Error('Unable to create audio output');
      }
    }
  }

  private setAudioStream(stream: Readable): void {
    if (this.audioStream !== undefined) {
      this.audioStream.unpipe(this.audioOutput);
    }
    this.audioStream = stream;
    this.audioOutput.clear();
    this.audioStream.pipe(this.audioOutput);
  }
}
