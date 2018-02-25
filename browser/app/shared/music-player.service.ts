import { Injectable, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

import { Music, PlayerState } from '../../../shared';

const ipc = window.require('ipc-promise');

const STATE_UPDATE_INTERVAL = 60000;

@Injectable()
export class MusicPlayerService implements OnInit {
  private music: Music;
  private state: PlayerState;
  private stateSubject: BehaviorSubject<PlayerState> = new BehaviorSubject<PlayerState>(PlayerState.Stopped);
  private time: number;
  private timerId: number;
  private timeSubject: Subject<number> = new Subject<number>();

  ngOnInit(): void {
    setInterval(async () => this.updateState(), STATE_UPDATE_INTERVAL);
  }

  onStateChange(): Observable<PlayerState> {
    return this.stateSubject;
  }

  onProgress(): Observable<number> {
    return this.timeSubject;
  }

  async pause(): Promise<void> {
    if (await this.getState() === PlayerState.Playing) {
      this.setState(await ipc.send('player', 'pause'));
    }
    if (this.state === PlayerState.Paused) {
      this.stopTimer();
    }
  }

  async play(music: Music): Promise<void> {

    if (await this.getState() === PlayerState.Playing) {
      await this.stop();
    }

    this.setState(await ipc.send('player', { name: 'play', args: [music.path] }));

    if (this.state === PlayerState.Playing) {
      this.music = music;
      this.time = 0;
      this.startTimer();
    }
  }

  async resume(): Promise<void> {
    if (await this.getState() === PlayerState.Paused) {
      this.setState(await ipc.send('player', 'resume'));
    }
    if (this.state === PlayerState.Playing) {
      this.startTimer();
    }
  }

  async seek(timeSeconds: number): Promise<void> {
    if (await this.getState() === PlayerState.Playing) {
      this.setState(await ipc.send('player', { name: 'seek', args: [timeSeconds] }));

      if (this.state === PlayerState.Playing) {
        console.log(`Seek to ${timeSeconds}s`);
        this.time = timeSeconds;
        this.timeSubject.next(this.time);
      } else {
        await this.stop();
      }
    } else {
      await this.stop();
    }
  }

  async stop(): Promise<void> {
    this.stopTimer();
    this.time = 0;

    if (await this.getState() !== PlayerState.Stopped) {
      this.setState(await ipc.send('player', 'stop'));
    }
  }

  private async getState(): Promise<PlayerState> {
    return ipc.send('player', 'getState');
  }

  private setState(state: PlayerState): void {
    if (this.stateSubject.getValue() !== state) {
      console.log('State:', state);
      this.state = state;
      this.stateSubject.next(state);
    }
  }

  private startTimer(): void {
    this.timerId = setInterval(async () => {
      this.time++;

      // Should be done in the node player, find a way!
      if (this.time >= (this.music.duration - 1)) {
        await this.stop();
      } else {
        this.timeSubject.next(this.time);
      }

    }, 1000);
  }

  private stopTimer(): void {
    window.clearInterval(this.timerId);
    this.timeSubject.next(this.time);
  }

  private async updateState(): Promise<void> {
    this.setState(await this.getState());
  }
}
