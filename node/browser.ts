import { createHash } from 'crypto';
import * as ElectronStore from 'electron-store';
import { lstatSync, pathExistsSync, readdir } from 'fs-extra';
import { join } from 'path';

const store = new ElectronStore();

export class Browser {

  static create(): Browser {
    return new Browser();
  }

  async getMusicList(path: string): Promise<string[]> {

    if (!pathExistsSync(path)) {
      throw Error('Invalid path');
    }

    let musics;

    if (store.has('musicList')) {
      const musicList = store.get('musicList');
      musics = musicList.musics;
    } else {
      musics = await this.listFiles(path);
      const md5 = createHash('md5').update(musics.join('')).digest('hex');
      store.set('musicList', { md5, musics });
      console.log('musics updated');
    }

    return musics;
  }

  async listFiles(path: string): Promise<string[]> {
    if (lstatSync(path).isDirectory()) {
      const res = [];
      (await ((await readdir(path)).map(async dir => this.listFiles(join(path, dir)))))
        .forEach(a => res.push(...a));
      return res;
    }
    return [path];
  }
}
