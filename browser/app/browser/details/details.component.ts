import { Component, Input } from '@angular/core';

import { Music } from '../../../../shared';
import { Album, MusicManagerService, MusicPlayerService } from '../../shared';

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
})
export class DetailsComponent {
  @Input() album: Album;
  @Input() backgroundColor: string;
  @Input() width: number;

  constructor(private musicManagerService: MusicManagerService, private musicPlayerService: MusicPlayerService) {}

  async play(music: Music): Promise<void> {
    this.musicManagerService.setActiveMusic(music);
    return this.musicPlayerService.play(music);
  }
}
