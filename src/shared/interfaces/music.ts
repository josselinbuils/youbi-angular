export interface Music {
  album: string;
  albumArtist: string;
  artist: string;
  artists: string[];
  comment: string[];
  composer: string[];
  disk: { no?: number; of?: number };
  duration: number;
  genre: string[];
  coverURL?: string;
  path: string;
  picture?: { data: any; format: string }[];
  readableDuration: string;
  sampleRate: number;
  title: string;
  track: { no: number; of: number };
  year: number;
}
