import { Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import * as moment from 'moment';

import { PlayerState } from '../../../shared/constants';
import { Music } from '../../../shared/interfaces';
import { Logger, MusicManagerService, MusicPlayerService } from '../shared/services';

const THUMB_WIDTH = 10;

const logger = Logger.create('ControlBarComponent');

@Component({
  selector: 'app-control-bar',
  templateUrl: './control-bar.component.html',
  styleUrls: ['./control-bar.component.scss'],
})
export class ControlBarComponent implements OnInit {

  @ViewChild('progressBar') progressElementRef: ElementRef;

  activeMusic: Music;
  playerState: PlayerState;
  PlayerState = PlayerState;
  progress = 0;
  random: boolean;
  readableDuration = '00:00';
  readableTime: string;
  repeat: boolean;
  seeking: boolean;
  showOutputSelector = false;

  constructor(private musicManagerService: MusicManagerService,
              private musicPlayerService: MusicPlayerService,
              private renderer: Renderer2) {}

  async next(): Promise<void> {
    logger.debug('next()');
    await this.musicPlayerService.next();
  }

  ngOnInit(): void {
    logger.debug('ngOnInit()');

    this.reset();

    this.musicPlayerService
      .onActiveMusicChange()
      .subscribe(async music => {
        logger.debug('->onActiveMusicChange');

        if (music.coverURL === undefined && music.coverKey !== undefined) {
          await this.musicManagerService.retrieveCovers([music]);
        }

        this.reset();
        this.activeMusic = music;
        this.readableDuration = moment.utc(this.activeMusic.duration * 1000).format('mm:ss');
      });

    this.musicPlayerService
      .onStateChange()
      .subscribe(state => {
        logger.debug('->onStateChange:', state);

        this.playerState = state;

        if (state === PlayerState.Stopped) {
          this.reset();
        }
      });

    this.musicPlayerService
      .onProgress()
      .subscribe(time => {
        if (!this.seeking) {
          this.setCurrentTime(time);
        }
      });
  }

  async play(): Promise<void> {
    logger.debug('play()');

    switch (this.playerState) {
      case PlayerState.Paused:
        await this.musicPlayerService.resume();
        break;

      case PlayerState.Playing:
        await this.musicPlayerService.pause();
        break;

      case PlayerState.Stopped:
        await this.musicPlayerService.play();
    }
  }

  async prev(): Promise<void> {
    logger.debug('prev()');
    await this.musicPlayerService.prev();
  }

  startSeek(downEvent: MouseEvent): void {
    logger.debug('startSeek()');

    const progressBarElement = this.progressElementRef.nativeElement;
    const progressBarWidth = parseInt(getComputedStyle(progressBarElement).width, 10);
    const left = progressBarElement.getBoundingClientRect().left;
    this.seeking = true;

    const getTime = (event) => {
      const duration = this.activeMusic.duration;
      const time = Math.round((event.clientX - left - THUMB_WIDTH / 2) / progressBarWidth * duration);
      return Math.max(Math.min(time, duration - 1), 0);
    };

    // When decoding is in progress, we need to wait for musicPlayerService.seek to answer before setting seeking to false to avoid having
    // progressbar moving until seek is done
    const seek = async (time: number) => {
      await this.musicPlayerService.seek(time);
      this.seeking = false;
    };

    this.setCurrentTime(getTime(downEvent));

    const cancelMouseMove = this.renderer.listen('window', 'mousemove', (moveEvent: MouseEvent) => {
      this.setCurrentTime(getTime(moveEvent));
    });

    const cancelMouseUp = this.renderer.listen('window', 'mouseup', (upEvent: MouseEvent) => {
      cancelMouseMove();
      cancelMouseUp();
      return seek(getTime(upEvent)) as any;
    });
  }

  private reset(): void {
    logger.debug('reset()');
    this.progress = 0;
    this.readableTime = '00:00';
  }

  private setCurrentTime(time: number): void {
    this.progress = Math.round(time / this.activeMusic.duration * 100);
    this.readableTime = moment.utc(time * 1000).format('mm:ss');
  }
}
