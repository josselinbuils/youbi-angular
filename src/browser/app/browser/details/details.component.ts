import {
  AfterContentInit,
  Component,
  ElementRef,
  Input,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import debounce from 'lodash-es/debounce';

import { PlayerState } from '../../../../shared/constants';
import { Music } from '../../../../shared/interfaces';
import { Album } from '../../shared/interfaces';
import { Logger, MusicPlayerService } from '../../shared/services';
import { computeItemSize } from '../../shared/utils';

const COLUMN_MARGIN_PX = 20;
const MAX_COLUMNS_BY_ROW = 4;
const MIN_COLUMNS_BY_ROW = 1;
const PREFERRED_COLUMN_WIDTH_PX = 400;

const logger = Logger.create('DetailsComponent');

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
})
export class DetailsComponent implements AfterContentInit, OnInit {
  @Input() set album(album: Album | undefined) {
    if (album !== undefined) {
      this.currentAlbum = album;
      this.disks = [];

      if (this.validateDiskInfo(album.musics)) {
        for (let i = 1; i <= album.musics[0].disk.of; i++) {
          const diskMusics = album.musics.filter(
            (music) => music.disk.no === i
          );
          this.disks.push(this.computeColumns(diskMusics));
        }
      } else {
        this.disks.push(this.computeColumns(album.musics));
      }
    }
  }

  @Input() set colorPalette(palette: string[] | undefined) {
    if (palette !== undefined) {
      this.backgroundStyle = palette[0];
      this.selectedBackgroundStyle = palette[1];
      this.textStyle = palette[1];
      this.selectedTextStyle = palette[0];
    }
  }

  @Input() width: number;

  @ViewChild('details') detailsElementRef: ElementRef;

  activeMusic: Music;
  backgroundStyle: string;
  currentAlbum: Album;
  disks: Column[][];
  selected: Music;
  selectedBackgroundStyle: string;
  selectedTextStyle: string;
  playerState: PlayerState;
  PlayerState = PlayerState;
  textStyle: string;

  private debouncedResizeEndHandler = debounce(this.resizeEndHandler, 50);

  constructor(
    private musicPlayerService: MusicPlayerService,
    private renderer: Renderer2
  ) {
    this.activeMusic = musicPlayerService.getActiveMusic();
  }

  ngAfterContentInit(): void {
    new (window as any).ResizeObserver((entries) =>
      this.debouncedResizeEndHandler(entries[0].contentRect)
    ).observe(this.detailsElementRef.nativeElement);
  }

  ngOnInit(): void {
    logger.debug('ngOnInit()');

    this.musicPlayerService
      .onActiveMusicChange()
      .subscribe((music) => (this.activeMusic = music));

    this.musicPlayerService
      .onStateChange()
      .subscribe((state) => (this.playerState = state));
  }

  async play(musics: Music[], index: number): Promise<void> {
    logger.debug('play()');
    return this.musicPlayerService.play(musics, index);
  }

  select(music: Music): void {
    logger.debug('select()');
    this.selected = music;
  }

  private computeColumns(musics: Music[]): Column[] {
    logger.debug('computeColumns()');

    const style = window.getComputedStyle(this.detailsElementRef.nativeElement);
    const padding = parseInt(
      style.getPropertyValue('padding').split(' ')[1],
      10
    );
    const containerWidth =
      this.detailsElementRef.nativeElement.clientWidth - padding;
    const { itemsByLine } = computeItemSize(
      containerWidth,
      COLUMN_MARGIN_PX,
      PREFERRED_COLUMN_WIDTH_PX,
      MIN_COLUMNS_BY_ROW,
      MAX_COLUMNS_BY_ROW
    );
    const musicsByColumn = Math.ceil(musics.length / itemsByLine);
    const width = `calc(${(100 / itemsByLine).toFixed(2)}% - 60px)`;
    const columns = [];
    let start = 0;

    for (let i = 1; i <= itemsByLine; i++) {
      columns.push({
        musics: musics.slice(start, start + musicsByColumn),
        width,
      });
      start += musicsByColumn;
    }
    return columns;
  }

  private resizeEndHandler(contentRect: ClientRect): void {
    if (contentRect.height > 0) {
      const detailsElement = this.detailsElementRef.nativeElement;
      const style = `${detailsElement.getAttribute('style')} --max-height: ${
        contentRect.height + 20
      }px`;
      this.renderer.setAttribute(detailsElement, 'style', style);
    }
  }

  private validateDiskInfo(musics: Music[]): boolean {
    return !musics.some(
      (music) =>
        typeof music.disk.no !== 'number' || typeof music.disk.of !== 'number'
    );
  }
}

interface Column {
  musics: Music[];
  width: string;
}
