import { AfterContentInit, Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { Music, validate } from '../../../shared';
import { Album, MusicManagerService, MusicPlayerService } from '../shared';

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
  albumLines: Album[][];
  detailsBackground: string;
  selectedAlbum: Album;
  itemSize: number;
  itemsByLine: number;
  lineWidth: number;
  musics: Music[];

  constructor(public sanitizer: DomSanitizer, private hostElementRef: ElementRef, private musicManagerService: MusicManagerService,
              private musicPlayerService: MusicPlayerService) {}

  async play(album: Album): Promise<void> {
    const music = album.musics[0];
    this.musicManagerService.setActiveMusic(music);
    return this.musicPlayerService.play(music);
  }

  ngAfterContentInit(): void {
    this.computeItemSize();
  }

  async ngOnInit(): Promise<void> {
    this.musics = await this.musicManagerService.getMusicList();

    this.albums = Object.entries(this.groupBy(this.musics, 'album'))
      .map(([name, musics]) => {
        const { artist, imageUrl } = musics[0];
        return { artist, imageUrl, musics, name };
      });
    console.log(this.albums);

    this.computeLines();

    this.musicManagerService.setActiveMusic(this.musics[0]);
    console.log(this.musics);
  }

  @HostListener('window:resize')
  resizeHandler(): void {
    const itemsByLine = this.itemsByLine;

    this.computeItemSize();

    if (this.albums !== undefined && (itemsByLine === undefined || this.itemsByLine !== itemsByLine)) {
      this.computeLines();
    }
  }

  async showDetails(album: Album): Promise<void> {
    if (this.selectedAlbum !== album) {
      if (validate.string(album.imageUrl)) {
        const rgb = await this.getAverageRGB(album.imageUrl);
        this.detailsBackground = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
      } else {
        this.detailsBackground = '#293559';
      }
      this.selectedAlbum = album;
    } else {
      delete this.selectedAlbum;
    }
  }

  private computeItemSize(): void {
    const dWidths: number[] = [];

    for (let i = MIN_ITEMS_BY_ROW; i <= MAX_ITEMS_BY_ROW; i++) {
      const width = Math.floor((this.hostElementRef.nativeElement.offsetWidth - (i + 1) * ITEM_MARGIN_PX) / i);

      dWidths[i] = Math.abs(width - PREFERRED_ITEM_WIDTH_PX);

      if (i === MIN_ITEMS_BY_ROW || (width > 0 && dWidths[i] < dWidths[i - 1])) {
        this.itemSize = width;
        this.itemsByLine = i;
        this.lineWidth = width * i + (i - 1) * ITEM_MARGIN_PX;
      }
    }
  }

  private computeLines(): void {
    const linesCount = Math.ceil(this.albums.length / this.itemsByLine);
    this.albumLines = [];
    for (let i = 0; i < linesCount; i++) {
      this.albumLines.push(this.albums.slice(i * this.itemsByLine, (i + 1) * this.itemsByLine));
    }
  }

  private async getAverageRGB(imageUrl: string): Promise<number[]> {

    const image = await new Promise<HTMLImageElement>(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
    });

    const blockSize = 5; // only visit every 5 pixels
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const rgb = [0, 0, 0];

    canvas.height = image.height;
    canvas.width = image.width;

    context.drawImage(image, 0, 0);

    const data = context.getImageData(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < data.data.length; i += blockSize * 4) {
      rgb[0] += data.data[i];
      rgb[1] += data.data[i + 1];
      rgb[2] += data.data[i + 2];
    }

    const count = Math.round(data.data.length / (blockSize * 4));
    rgb[0] = Math.round(rgb[0] / count);
    rgb[1] = Math.round(rgb[1] / count);
    rgb[2] = Math.round(rgb[2] / count);

    return rgb;
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
