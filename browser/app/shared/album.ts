import { Music } from '../../../shared';

export interface Album {
  artist: string;
  imageUrl: string;
  musics: Music[];
  name: string;
}
