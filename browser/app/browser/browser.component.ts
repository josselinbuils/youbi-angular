import { AfterContentInit, Component } from '@angular/core';

const ipc = window.require('ipc-promise');

@Component({
  selector: 'app-browser',
  templateUrl: './browser.component.html',
  styleUrls: ['./browser.component.scss'],
})
export class BrowserComponent implements AfterContentInit {

  currentMusic: any = {};

  async ngAfterContentInit(): Promise<void> {
    const musics = await ipc.send('browser', { name: 'getMusicList', args: ['\\\\DISKSTATION\\music'] });
    ipc.send('player', { name: 'play', args: [musics[1]] });
  }
}
