import { Component } from '@angular/core';

import { PlayerState } from '../../../shared/constants';
import { MusicPlayerService } from '../shared/music-player.service';

@Component({
  selector: 'app-control-bar',
  templateUrl: './control-bar.component.html',
  styleUrls: ['./control-bar.component.scss'],
})
export class ControlBarComponent {

  playerState: PlayerState;
  PlayerState = PlayerState;
  progress = 0;
  random: boolean;
  repeat: boolean;

  constructor(private musicPlayerService: MusicPlayerService) {
    musicPlayerService.onState().subscribe(state => this.playerState = state);
  }

  next(): void {}

  async play(): Promise<void> {
    switch (this.playerState) {

      case PlayerState.Paused:
        await this.musicPlayerService.resume();
        break;

      case PlayerState.Playing:
        await this.musicPlayerService.pause();
        break;

      case PlayerState.Stopped:
        await this.musicPlayerService.play('C:\\Users\\Josselin\\Downloads\\3-02 C\'est Une Belle Journee.m4a');
    }
  }

  prev(): void {}

  startSeek(): void {}
}
