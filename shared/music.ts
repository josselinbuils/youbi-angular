export interface Music {
  album: string;
  artist: string;
  artists: string[];
  composer: string;
  disk: { no: number; of: number };
  duration: number;
  genre: string[];
  imageUrl?: string;
  path: string;
  picture?: { data: any; format: string };
  readableDuration: string;
  sampleRate: number;
  title: string;
  track: { no: number; of: number };
  year: number;
}
