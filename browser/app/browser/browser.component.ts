import { Component, OnInit } from '@angular/core';

import { Music } from '../shared/music';
import { MusicListService } from '../shared/music-list.service';

@Component({
  selector: 'app-browser',
  templateUrl: './browser.component.html',
  styleUrls: ['./browser.component.scss'],
})
export class BrowserComponent implements OnInit {

  currentMusic: any = {};
  musicList: Music[];

  constructor(private musicListService: MusicListService) {}

  async ngOnInit(): Promise<void> {
    this.musicList = await this.musicListService.getList();
    console.log(this.musicList);
  }
}
