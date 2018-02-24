import { Component } from '@angular/core';

const ipc = window.require('ipc-promise');

@Component({
  selector: 'app-control-bar',
  templateUrl: './control-bar.component.html',
  styleUrls: ['./control-bar.component.scss'],
})
export class ControlBarComponent {

  playerState = PlayerState;
  progress = 0;
  random: boolean;
  repeat: boolean;
  state: PlayerState;

  next(): void {}

  async play(): Promise<void> {
    const state = await ipc.send('player', 'getState');

    switch (state) {
      case PlayerState.Paused:
        this.state = await ipc.send('player', 'resume');
        break;

      case PlayerState.Playing:
        this.state = await ipc.send('player', 'pause');
        break;

      case PlayerState.Stopped:
        // const musics = await ipc.send('browser', { name: 'getMusicList', args: ['\\\\DISKSTATION\\music'] });
        this.state =
          await ipc.send('player', { name: 'play', args: ['C:\\Users\\Josselin\\Downloads\\3-02 C\'est Une Belle Journee.m4a'] });
    }
    console.log('state:', this.state);
  }

  prev(): void {}

  startSeek(): void {}
}

enum PlayerState {
  Paused = 'PAUSED',
  Playing = 'PLAYING',
  Stopped = 'STOPPED',
}
