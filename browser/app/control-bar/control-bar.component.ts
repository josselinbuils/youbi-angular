import { Component } from '@angular/core';

const ipc = window.require('ipc-promise');

@Component({
  selector: 'app-control-bar',
  templateUrl: './control-bar.component.html',
  styleUrls: ['./control-bar.component.scss'],
})
export class ControlBarComponent {

  played = true;
  progress = 0;
  random: boolean;
  repeat: boolean;

  next(): void {}

  async play(): Promise<void> {
    const musics = await ipc.send('browser', { name: 'getMusicList', args: ['\\\\DISKSTATION\\music'] });
    ipc.send('player', { name: 'play', args: [musics.filter(m => /journee/i.test(m))[0]] });
  }

  prev(): void {}

  startSeek(): void {}
}
