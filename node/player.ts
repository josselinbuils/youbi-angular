import { pathExistsSync } from 'fs-extra';
import { AudioOutput, getAPIList } from 'naudiodon';
import { Readable } from 'stream';

import { PlayerState } from '../shared/constants';
import { AudioApi } from '../shared/interfaces';
import { delay } from '../shared/utils';

import { Decoder, DecodingFormat } from './decoder';
import { Logger } from './logger';

const AUDIO_OUTPUT_RETRIES = 2;
const DEFAULT_API_ID = -1;
const DEFAULT_CHANNEL_COUNT = 2;
const DEFAULT_SAMPLE_FORMAT = 16;
const DEFAULT_SAMPLE_RATE = 44100;

export class Player {

  private audioApi: AudioApi;
  private audioOutput: AudioOutput;
  private audioStream;
  private currentMusic?: { format: DecodingFormat };
  private decoder = Decoder.create();

  static create(): Player {
    return new Player(Logger.create('Player'));
  }

  getActiveAudioAPI(): AudioApi {
    this.logger.debug('getActiveAudioAPI():', this.audioApi);
    return this.audioApi;
  }

  getAudioAPIList(): AudioApi[] {
    return getAPIList();
  }

  getState(): PlayerState {
    let state: PlayerState;

    try {
      if (this.audioOutput !== undefined) {
        if (this.audioOutput.isActive()) {
          state = PlayerState.Playing;
        }
        if (this.decoder.isActive() && this.audioOutput.isStopped()) {
          state = PlayerState.Paused;
        }
      }
    } catch (error) {
      this.logger.error(`Unable to retrieve player state: ${error.message}`);
    }

    if (state === undefined) {
      state = PlayerState.Stopped;
    }

    this.logger.debug('getState():', state);
    return state;
  }

  selectAudioAPI(api: AudioApi): void {
    this.logger.debug('selectAudioAPI():', api.name);
    try {
      this.audioOutput = this.getAudioOutput(api);
      this.audioApi = api;
    } catch (error) {
      throw new Error('Unable to select audio API');
    }
  }

  pause(): PlayerState {
    this.logger.debug('pause()');

    if (this.getState() === PlayerState.Playing) {
      this.logger.info('Pause');
      try {
        this.audioOutput.stop();
      } catch (error) {
        this.logger.error(error);
      }
    }
    return this.getState();
  }

  async play(path: string): Promise<PlayerState> {
    this.logger.debug('play():', path);

    if (!pathExistsSync(path)) {
      throw new Error('File not found');
    }

    try {
      this.stop();

      const format = await this.decoder.get('format', path) as DecodingFormat;
      this.currentMusic = { format };

      this.logger.debug(`Audio format: ${format.formatID.toUpperCase()} ${format.bitsPerChannel}bit/${format.sampleRate}Hz`);

      this.audioOutput = this.getAudioOutput(this.audioApi, format);
      this.setAudioStream(await this.decoder.start(path));
      // Delay needed to fill enough the audio stream before starting reading it, check should be done by the lib
      await delay(100);
      this.audioOutput.start();

      if (this.getState() !== PlayerState.Playing) {
        throw new Error('Unknown error');
      }

    } catch (error) {
      this.logger.error(`Unable to play: ${error.message}`);
      this.logger.debug(`Audio output state: active=${this.audioOutput.isActive()} stopped=${this.audioOutput.isStopped()}`);
      this.stop();
    }

    return this.getState();
  }

  resume(): PlayerState {
    this.logger.debug('resume()');

    if (this.getState() === PlayerState.Paused) {
      try {
        this.audioOutput.start();
      } catch (error) {
        this.logger.error(`Unable to resume: ${error.message}`);
        this.logger.error(error);
      }
    }
    return this.getState();
  }

  async seek(timeSeconds: number): Promise<PlayerState> {
    this.logger.debug(`seek(): ${timeSeconds}s`);

    if (this.currentMusic === undefined) {
      throw new Error('No current music');
    }

    try {
      const format = this.currentMusic.format;
      const byteOffset = timeSeconds * format.sampleRate * format.bitsPerChannel * format.channelsPerFrame / 8;
      this.setAudioStream(await this.decoder.seek(byteOffset));
    } catch (error) {
      this.logger.error(`Unable to seek: ${error.message}`);
    }

    return this.getState();
  }

  stop(): PlayerState {
    this.logger.debug('stop()');
    try {
      if (this.decoder.isActive()) {
        this.logger.debug('Decoder active, stops it');
        this.decoder.stop();
      }
      if (this.audioOutput !== undefined && this.audioOutput.isActive()) {
        this.logger.debug('Audio output active, stops it');
        this.audioOutput.stop();
      }
    } catch (error) {
      this.logger.error(`Unable to stop: ${error.message}`);
    }
    return this.getState();
  }

  private constructor(private logger: Logger) {
    this.logger.debug('constructor()');
  }

  private getAudioOutput(api?: AudioApi, format?: DecodingFormat, retries: number = AUDIO_OUTPUT_RETRIES): AudioOutput {
    this.logger.debug('getAudioOutput()');

    const options = {
      apiId: DEFAULT_API_ID,
      channelCount: DEFAULT_CHANNEL_COUNT,
      sampleFormat: DEFAULT_SAMPLE_FORMAT,
      sampleRate: DEFAULT_SAMPLE_RATE,
    };

    if (api !== undefined) {
      options.apiId = api.id;
    }

    if (format !== undefined) {
      options.channelCount = format.channelsPerFrame;
      options.sampleFormat = format.bitsPerChannel;
      options.sampleRate = format.sampleRate;
    }

    if (this.audioOutput !== undefined) {
      if (JSON.stringify(options) === JSON.stringify(this.audioOutput.options)) {
        this.logger.debug('Uses existing audio output');
        return this.audioOutput;
      } else {
        this.logger.debug('Closes existing audio output');
        this.audioOutput.close();
        delete this.audioOutput;
      }
    }

    let audioOutput: AudioOutput;
    try {
      this.logger.debug(`Creates audio output with ${api !== undefined ? api.name : 'default'} API`);

      audioOutput = new AudioOutput(options);
      audioOutput.on('finish', () => this.logger.debug('Audio output stopped'));
      return audioOutput;

    } catch (error) {
      this.logger.error(`Unable to create audio output: ${error.message}`);

      if (retries > 0) {
        this.logger.debug(`Retry ${ AUDIO_OUTPUT_RETRIES - retries + 1}/${AUDIO_OUTPUT_RETRIES}`);
        return this.getAudioOutput(api, format, retries - 1);
      } else {
        throw new Error('Unable to create audio output');
      }
    }
  }

  private setAudioStream(stream: Readable): void {
    this.logger.debug('setAudioStream()');

    if (this.audioStream !== undefined) {
      this.audioStream.unpipe(this.audioOutput);
    }

    this.audioStream = stream;
    this.audioOutput.clear();
    this.audioStream.pipe(this.audioOutput);
  }
}
