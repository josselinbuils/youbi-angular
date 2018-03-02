import { AfterContentInit, Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import * as ColorThief from 'color-thief-browser';

import { Music, validate } from '../../../shared';
import { Album, MusicManagerService, MusicPlayerService } from '../shared';
import { Logger } from '../shared/logger.service';
import { computeItemSize } from '../shared/utils';

const ITEM_MARGIN_PX = 20;
const MAX_ITEMS_BY_ROW = 30;
const MIN_ITEMS_BY_ROW = 4;
const PREFERRED_ITEM_WIDTH_PX = 200;

const colorThief = new ColorThief();
const logger = Logger.create('BrowserComponent');

@Component({
  selector: 'app-browser',
  templateUrl: './browser.component.html',
  styleUrls: ['./browser.component.scss'],
})
export class BrowserComponent implements AfterContentInit, OnInit {
  albums: Album[];
  albumLines: Album[][];
  colorPalette: string[];
  selectedAlbum: Album;
  itemSize: number;
  itemsByLine: number;
  lineWidth: number;
  musics: Music[];

  constructor(public sanitizer: DomSanitizer, private hostElementRef: ElementRef, private musicManagerService: MusicManagerService,
              private musicPlayerService: MusicPlayerService) {}

  ngAfterContentInit(): void {
    logger.debug('ngAfterContentInit()');
    this.computeItemSize();
  }

  async ngOnInit(): Promise<void> {
    logger.debug('ngOnInit()');

    this.musics = await this.musicManagerService.getMusicList();

    this.albums = Object.entries(this.groupBy(this.musics, 'album'))
      .map(([name, musics]) => {
        const { artist, imageUrl } = musics[0];
        return { artist, imageUrl, musics, name };
      });

    logger.debug('Albums:', this.albums);
    this.computeLines();
    this.musicPlayerService.setPlaylist(this.albums[0].musics);
  }

  @HostListener('window:resize')
  resizeHandler(): void {
    const itemsByLine = this.itemsByLine;

    this.computeItemSize();

    if (this.albums !== undefined && (itemsByLine === undefined || this.itemsByLine !== itemsByLine)) {
      this.computeLines();
    }
  }

  async toggleDetails(album: Album): Promise<void> {
    logger.debug('toggleDetails()');

    if (this.selectedAlbum !== album) {
      this.colorPalette = validate.string(album.imageUrl)
        ? (await this.getColorPalette(album.imageUrl)).map(rgb => `rgb(${rgb.join(', ')})`)
        : ['#293559', '#dee3f0'];
      this.selectedAlbum = album;
    } else {
      delete this.selectedAlbum;
    }
  }

  private computeItemSize(): void {
    const res = computeItemSize(
      this.hostElementRef.nativeElement.offsetWidth, ITEM_MARGIN_PX, PREFERRED_ITEM_WIDTH_PX, MIN_ITEMS_BY_ROW, MAX_ITEMS_BY_ROW,
    );
    this.itemSize = res.itemSize;
    this.itemsByLine = res.itemsByLine;
    this.lineWidth = res.lineWidth;
  }

  private computeLines(): void {
    const linesCount = Math.ceil(this.albums.length / this.itemsByLine);
    this.albumLines = [];
    for (let i = 0; i < linesCount; i++) {
      this.albumLines.push(this.albums.slice(i * this.itemsByLine, (i + 1) * this.itemsByLine));
    }
  }

  private async getColorPalette(imageUrl: string): Promise<number[][]> {
    logger.debug('getColorPalette()');

    return new Promise<number[][]>(resolve => {
      const img = new Image();
      img.onload = () => resolve(colorThief.getPalette(img, 2));
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
    });
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
