import { Music } from '../../../../shared/interfaces';

export interface Album {
  artist: string;
  firstLetter: string;
  musics: Music[];
  name: string;
  year?: number;
}
