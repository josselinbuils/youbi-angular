import { Music } from './music';

export interface MusicMap {
  [artist: string]: {
    [album: string]: Music[];
  };
}
