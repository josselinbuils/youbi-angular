import { Component, OnInit } from '@angular/core';

import { MusicMap } from '../../../shared';
import { MusicManagerService } from '../shared';

@Component({
  selector: 'app-browser',
  templateUrl: './browser.component.html',
  styleUrls: ['./browser.component.scss'],
})
export class BrowserComponent implements OnInit {
  musicMap: MusicMap;

  constructor(private musicManagerService: MusicManagerService) {}

  async ngOnInit(): Promise<void> {
    this.musicMap = await this.musicManagerService.getMusicMap();
    this.musicManagerService.setActiveMusic(this.musicMap.Adele['19'][0]);
    console.log(this.musicMap);
  }
}
