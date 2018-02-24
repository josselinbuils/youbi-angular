import { Component, OnInit } from '@angular/core';

import { MusicMap } from '../../../shared/music-map';
import { MusicManagerService } from '../shared/music-manager.service';

@Component({
  selector: 'app-browser',
  templateUrl: './browser.component.html',
  styleUrls: ['./browser.component.scss'],
})
export class BrowserComponent implements OnInit {

  currentMusic: any = {};
  musicMap: MusicMap;

  constructor(private musicListService: MusicManagerService) {}

  async ngOnInit(): Promise<void> {
    this.musicMap = await this.musicListService.getMusicMap();
    console.log(this.musicMap);
  }
}
