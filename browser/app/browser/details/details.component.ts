import { Component, Input } from '@angular/core';

import { Music } from '../../../../shared';
import { Album, MusicPlayerService } from '../../shared';

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
})
export class DetailsComponent {
  @Input() album: Album;
  @Input() backgroundColor: string;
  @Input() width: number;

  constructor(private musicPlayerService: MusicPlayerService) {}

  async play(musics: Music[], index: number): Promise<void> {
    return this.musicPlayerService.play(musics, index);
  }
}
