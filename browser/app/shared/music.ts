export interface Music {
  album: string;
  artist: string;
  artists: string[];
  composer: string;
  disk: { no: number; of: number };
  duration: number;
  genre: string[];
  sampleRate: number;
  title: string;
  track: { no: number; of: number };
  year: number;
}
