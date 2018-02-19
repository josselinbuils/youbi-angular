import { Component } from '@angular/core';

const ipc = window.require('ipc-promise');

@Component({
  selector: 'app-control-bar',
  templateUrl: './control-bar.component.html',
  styleUrls: ['./control-bar.component.scss'],
})
export class ControlBarComponent {

  playing = false;
  progress = 0;
  random: boolean;
  repeat: boolean;

  next(): void {}

  play(): void {
    if (this.playing) {
      ipc.send('player', { name: 'stop' });
    } else {
      // const musics = await ipc.send('browser', { name: 'getMusicList', args: ['\\\\DISKSTATION\\music'] });
      ipc.send('player', { name: 'play', args: ['C:\\Users\\Josselin\\Downloads\\3-02 C\'est Une Belle Journee.m4a'] });
    }
    this.playing = !this.playing;
  }

  prev(): void {}

  startSeek(): void {}
}
