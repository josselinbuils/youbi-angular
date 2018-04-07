import { Music } from '../../../../shared/interfaces';

export interface Album {
  artist: string;
  coverURL?: string;
  firstArtistLetter?: string;
  musics: Music[];
  name: string;
  year?: number;
}
