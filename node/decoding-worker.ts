/* tslint:disable:no-unused-variable */

import { Asset } from 'av';

// Aurora codecs
// import 'aac';
import 'alac';
import 'flac.js';
import 'mp3';
import 'ogg.js';
import 'vorbis.js';

import { Command } from '../shared/interfaces';

import { EventStatus, WorkerEvent } from './worker-event';

const RESULT_EVENT = 'result';

class DecodingWorker {

  asset: Asset;

  private debug(message: string): void {
    this.send('debug', message);
  }

  private error(errorMessage: string): void {
    this.send(RESULT_EVENT, errorMessage, EventStatus.Error);
  }

  private get(event: string, path: string): void {
    this.debug(`get(): ${event} of ${path}`);
    this.asset = Asset.fromFile(path);
    this.asset.get(event, res => this.success(res));
    this.asset.on('error', error => this.error(error.message));
  }

  private hasDecoder(): void {
    const res = this.asset !== undefined && this.asset.decoder !== undefined;
    this.debug(`hasDecoder(): ${res}`);
    this.success(res);
  }

  init(): void {
    this.debug('init()');

    process.on('message', (command: Command) => {
      const { name, args } = command;

      if (['get', 'hasDecoder', 'isActive', 'start'].includes(name)) {
        this[name].apply(this, args);
      } else {
        this.error('Unknown command');
      }
    });
  }

  private isActive(): void {
    const active = this.asset !== undefined && this.asset.active;
    this.debug(`isActive(): ${active}`);
    this.success(active);
  }

  private send(name: string, data?: any, status?: EventStatus): void {
    const event: WorkerEvent = { data, name, status };
    process.send(event);
  }

  private start(path: string): void {
    this.debug(`start(): ${path}`);

    this.asset = Asset.fromFile(path);

    // Needs to wait for decodeStart event to have asset.decoder defined
    this.asset.on('decodeStart', () => {
      this.asset.decoder.on('data', typedArray => {
        process.stdout.write(Buffer.from(typedArray.buffer));
      });
      this.success();
    });

    let lastStep = 0;

    this.asset.on('buffer', progress => {
      const step = Math.round(progress / 10);

      if (step > lastStep || progress === 100) {
        lastStep = step;
        this.debug(`Decoded ${Math.round(progress)}%`);
      }
    });

    this.asset.on('error', error => this.error(error.message));
    this.asset.start();
  }

  private success(data?: any): void {
    this.send(RESULT_EVENT, data, EventStatus.Success);
  }
}

new DecodingWorker().init();
