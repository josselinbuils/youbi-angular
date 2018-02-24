import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';

import { PlayerState } from '../../../shared/constants';

const ipc = window.require('ipc-promise');

@Injectable()
export class MusicPlayerService {
  private state: PlayerState;
  private stateSubject: BehaviorSubject<PlayerState> = new BehaviorSubject<PlayerState>(PlayerState.Stopped);

  constructor() {
    // setInterval(async () => this.updateState(), 5000);
  }

  onState(): Observable<PlayerState> {
    return this.stateSubject;
  }

  async pause(): Promise<void> {
    if (await this.getState() === PlayerState.Playing) {
      this.setState(await ipc.send('player', 'pause'));
    }
  }

  async play(path: string): Promise<void> {
    this.setState(await ipc.send('player', { name: 'play', args: [path] }));
  }

  async resume(): Promise<void> {
    if (await this.getState() === PlayerState.Paused) {
      this.setState(await ipc.send('player', 'resume'));
    }
  }

  async seek(timeSeconds: number): Promise<void> {
    if (await this.getState() === PlayerState.Playing) {
      this.setState(await ipc.send('player', { name: 'seek', args: [timeSeconds] }));
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

  private async updateState(): Promise<void> {
    this.setState(await this.getState());
  }
}
