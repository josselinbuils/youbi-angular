import { AfterContentInit, Component, ElementRef, HostListener, OnInit, QueryList, ViewChildren } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import * as ColorThief from 'color-thief-browser';
import { debounce } from 'lodash';

import { Music } from '../../../shared/interfaces';
import { validate } from '../../../shared/utils';
import { Album } from '../shared/interfaces';
import { Logger, MusicManagerService, MusicPlayerService } from '../shared/services';
import { computeItemSize, groupBy } from '../shared/utils';

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

  @ViewChildren('item') items: QueryList<ElementRef>;

  albums: Album[];
  albumLines: Album[][];
  colorPalette: string[];
  selectedAlbum: Album;
  itemSize: number;
  itemsByLine: number;
  letter: string;
  lineWidth: number;
  musics: Music[];

  private intersectionObserver: IntersectionObserver;
  private scrolling = false;
  private debouncedScrollEndHandler = debounce(this.scrollEndHandler, 500);

  constructor(public sanitizer: DomSanitizer,
              private hostElementRef: ElementRef,
              private musicManagerService: MusicManagerService,
              private musicPlayerService: MusicPlayerService) {}

  ngAfterContentInit(): void {
    logger.debug('ngAfterContentInit()');
    this.computeItemSize();
  }

  async ngOnInit(): Promise<void> {
    logger.debug('ngOnInit()');

    this.musics = await this.musicManagerService.getMusicList();
    this.albums = [];

    for (const [name, musics] of Object.entries(groupBy(this.musics, 'album'))) {
      const artist = musics[0].albumArtist !== undefined ? musics[0].albumArtist : musics[0].artist;
      const firstLetter = artist.slice(0, 1).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const album = { artist, firstLetter, musics, name };

      Object.defineProperty(album, 'coverURL', {
        enumerable: true,
        get: () => album.musics[0].coverURL,
      });

      this.albums.push(album);
    }

    this.albums = this.albums.sort((a, b) => {
      const artistComparison = a.artist.localeCompare(b.artist);
      return artistComparison !== 0 ? artistComparison : a.name.localeCompare(b.name);
    });

    logger.debug('Albums:', this.albums);

    if (this.albums.length > 0) {
      this.computeLines();
      this.musicPlayerService.setPlaylist(this.albums[0].musics);
    }

    logger.time('retrieveAlbumCovers');
    await this.musicManagerService.retrieveCovers(this.albums.map(album => album.musics[0]));
    logger.timeEnd('retrieveAlbumCovers');
  }

  @HostListener('window:resize')
  resizeHandler(): void {
    logger.debug('resizeHandler()');

    const itemsByLine = this.itemsByLine;
    this.computeItemSize();

    if (this.albums !== undefined && (itemsByLine === undefined || this.itemsByLine !== itemsByLine)) {
      this.computeLines();
    }
  }

  @HostListener('scroll')
  scrollHandler(): void {
    logger.debug('scrollHandler()');

    if (!this.scrolling) {
      this.scrollStartHandler();
    }
    this.debouncedScrollEndHandler();
  }

  async toggleDetails(album: Album): Promise<void> {
    logger.debug('toggleDetails()');

    if (this.selectedAlbum !== album) {
      const defaultColorPalette = ['#293559', '#dee3f0'];

      try {
        const coverURL = album.musics[0].coverURL;
        this.colorPalette = validate.string(coverURL)
          ? (await this.getColorPalette(coverURL)).map(rgb => `rgb(${rgb.join(', ')})`)
          : defaultColorPalette;
      } catch (error) {
        logger.error(`Unable to compute color palette: ${error.stack}`);
        this.colorPalette = defaultColorPalette;
      }

      this.selectedAlbum = album;
    } else {
      delete this.selectedAlbum;
    }
  }

  private computeItemSize(): void {
    logger.debug('computeItemSize()');

    const res = computeItemSize(
      this.hostElementRef.nativeElement.offsetWidth, ITEM_MARGIN_PX, PREFERRED_ITEM_WIDTH_PX, MIN_ITEMS_BY_ROW, MAX_ITEMS_BY_ROW,
    );
    this.itemSize = res.itemSize;
    this.itemsByLine = res.itemsByLine;
    this.lineWidth = res.lineWidth;
  }

  private computeLines(): void {
    logger.debug('computeLines()');

    const linesCount = Math.ceil(this.albums.length / this.itemsByLine);
    this.albumLines = [];

    for (let i = 0; i < linesCount; i++) {
      this.albumLines.push(this.albums.slice(i * this.itemsByLine, (i + 1) * this.itemsByLine));
    }
  }

  private async getColorPalette(coverURL: string): Promise<number[][]> {
    logger.debug('getColorPalette()');

    return new Promise<number[][]>(resolve => {
      const img = new Image();
      img.onload = () => resolve(colorThief.getPalette(img, 2));
      img.crossOrigin = 'anonymous';
      img.src = coverURL;
    });
  }

  private scrollStartHandler(): void {
    logger.debug('scrollStartHandler()');
    this.scrolling = true;

    if (this.items !== undefined) {
      this.intersectionObserver = new IntersectionObserver((intersections) => {
        const intersection = intersections.find(i => i.isIntersecting);

        if (intersection !== undefined) {
          this.letter = intersection.target.getAttribute('letter');
        }
      }, {
        root: this.hostElementRef.nativeElement,
        rootMargin: '0px 0px -95% 0px',
      });

      this.items.forEach(item => this.intersectionObserver.observe(item.nativeElement));
    }
  }

  private scrollEndHandler(): void {
    logger.debug('scrollEndHandler()');
    delete this.letter;
    this.intersectionObserver.disconnect();
    this.scrolling = false;
  }
}
