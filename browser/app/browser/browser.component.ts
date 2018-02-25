import { Component, OnInit } from '@angular/core';

import { Music } from '../../../shared';
import { MusicManagerService, MusicPlayerService } from '../shared';

@Component({
  selector: 'app-browser',
  templateUrl: './browser.component.html',
  styleUrls: ['./browser.component.scss'],
})
export class BrowserComponent implements OnInit {
  albums: Album[];
  musics: Music[];

  constructor(private musicManagerService: MusicManagerService, private musicPlayerService: MusicPlayerService) {}

  async play(album: Album): Promise<void> {
    const music = album.musics[0];
    this.musicManagerService.setActiveMusic(music);
    return this.musicPlayerService.play(music);
  }

  async ngOnInit(): Promise<void> {
    this.musics = await this.musicManagerService.getMusicList();

    this.albums = Object.entries(this.groupBy(this.musics, 'album'))
      .map(([name, musics]) => {
        const { artist, imageUrl } = musics[0];
        return { artist, imageUrl, musics, name };
      });
    console.log(this.albums);

    this.musicManagerService.setActiveMusic(this.musics[0]);
    console.log(this.musics);
  }

  private groupBy(array: Array<any>, key: string): { [key: string]: any } {
    return array.reduce((map, item) => {
      if (map[item[key]] === undefined) {
        map[item[key]] = [];
      }
      map[item[key]].push(item);
      return map;
    }, {});
  }
}

interface Album {
  artist: string;
  imageUrl: string;
  musics: Music[];
  name: string;
}
