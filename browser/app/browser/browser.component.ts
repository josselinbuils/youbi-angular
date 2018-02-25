import { AfterContentInit, Component, ElementRef, HostListener, OnInit } from '@angular/core';

import { Music } from '../../../shared';
import { MusicManagerService, MusicPlayerService } from '../shared';

const ITEM_MARGIN_PX = 20;
const MAX_ITEMS_BY_ROW = 30;
const MIN_ITEMS_BY_ROW = 4;
const PREFERRED_ITEM_WIDTH_PX = 210;

@Component({
  selector: 'app-browser',
  templateUrl: './browser.component.html',
  styleUrls: ['./browser.component.scss'],
})
export class BrowserComponent implements AfterContentInit, OnInit {
  albums: Album[];
  itemSize: number;
  musics: Music[];

  constructor(private hostElementRef: ElementRef, private musicManagerService: MusicManagerService,
              private musicPlayerService: MusicPlayerService) {}

  async play(album: Album): Promise<void> {
    const music = album.musics[0];
    this.musicManagerService.setActiveMusic(music);
    return this.musicPlayerService.play(music);
  }

  ngAfterContentInit(): void {
    this.itemSize = this.computeItemSize();
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

  @HostListener('window:resize')
  resizeHandler(): void {
    this.itemSize = this.computeItemSize();
  }

  private computeItemSize(): number {
    const dWidths: number[] = [];
    let finalWidth: number;

    for (let i = MIN_ITEMS_BY_ROW; i <= MAX_ITEMS_BY_ROW; i++) {
      const width = Math.floor((this.hostElementRef.nativeElement.offsetWidth - (i + 1) * ITEM_MARGIN_PX) / i);

      dWidths[i] = Math.abs(width - PREFERRED_ITEM_WIDTH_PX);

      if (i === MIN_ITEMS_BY_ROW || (width > 0 && dWidths[i] < dWidths[i - 1])) {
        finalWidth = width;
      }
    }

    return finalWidth;
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
