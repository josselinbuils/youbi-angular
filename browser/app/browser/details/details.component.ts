import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';

import { Music, PlayerState } from '../../../../shared';
import { Album, MusicPlayerService } from '../../shared';
import { Logger } from '../../shared/logger.service';
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
export class DetailsComponent implements OnInit {
  @Input() set album(album: Album) {
    this.currentAlbum = album;
    this.computeColumns(album.musics);
  }

  @Input() set colorPalette(palette: string[]) {
    this.backgroundStyle = palette[0];
    this.selectedBackgroundStyle = palette[1];
    this.textStyle = palette[1];
    this.selectedTextStyle = palette[0];
  }

  @Input() width: number;

  @ViewChild('details') detailsElementRef: ElementRef;

  activeMusic: Music;
  backgroundStyle: string;
  columns: Music[][];
  currentAlbum: Album;
  selected: Music;
  selectedBackgroundStyle: string;
  selectedTextStyle: string;
  playerState: PlayerState;
  PlayerState = PlayerState;
  textStyle: string;

  constructor(private musicPlayerService: MusicPlayerService) {
    this.activeMusic = musicPlayerService.getActiveMusic();
  }

  computeColumns(musics: Music[]): void {
    const style = window.getComputedStyle(this.detailsElementRef.nativeElement);
    const padding = parseInt(style.getPropertyValue('padding').split(' ')[1], 10);
    const containerWidth = this.detailsElementRef.nativeElement.clientWidth - padding;
    const { itemsByLine } = computeItemSize(
      containerWidth, COLUMN_MARGIN_PX, PREFERRED_COLUMN_WIDTH_PX, MIN_COLUMNS_BY_ROW, MAX_COLUMNS_BY_ROW,
    );
    const musicsByColumn = Math.ceil(musics.length / itemsByLine);
    this.columns = [];

    let start = 0;
    for (let i = 1; i <= itemsByLine; i++) {
      this.columns.push(musics.slice(start, start + musicsByColumn));
      start += musicsByColumn;
    }
  }

  ngOnInit(): void {
    logger.debug('ngOnInit()');

    this.musicPlayerService
      .onActiveMusicChange()
      .subscribe(music => this.activeMusic = music);

    this.musicPlayerService
      .onStateChange()
      .subscribe(state => this.playerState = state);
  }

  async play(musics: Music[], index: number): Promise<void> {
    logger.debug('play()');
    return this.musicPlayerService.play(musics, index);
  }

  select(music: Music): void {
    logger.debug('select()');
    this.selected = music;
  }
}
