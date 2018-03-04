import { Music } from '../../../../shared/interfaces';

export interface Album {
  artist: string;
  imageUrl: string;
  musics: Music[];
  name: string;
}
