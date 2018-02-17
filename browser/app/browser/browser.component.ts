import { AfterContentInit, Component, ElementRef, ViewChild } from '@angular/core';

const { createHash } = window.require('crypto');
// tslint:disable-next-line:variable-name
const ElectronStore = window.require('electron-store');
const { lstatSync, readdir, readFileSync } = window.require('fs-extra');
const { join } = window.require('path');

// tslint:disable-next-line:variable-name
const NodeAudioContext = window.require('web-audio-api').AudioContext;

const store = new ElectronStore();

@Component({
  selector: 'app-browser',
  templateUrl: './browser.component.html',
  styleUrls: ['./browser.component.scss'],
})
export class BrowserComponent implements AfterContentInit {

  @ViewChild('audio') audioElementRef: ElementRef;

  audioElement: any;
  currentMusic: any = {};

  loadMusic(music: any): void {
    this.currentMusic = music;
    this.audioElement.load();
  }

  play(): void {
    if (this.audioElement.paused) {
      this.audioElement.play();
    } else {
      this.audioElement.pause();
    }
  }

  playMusic(music: any): void {
    if (music.id !== this.currentMusic.id) {
      this.loadMusic(music);
    }
    this.play();
  }

  async ngAfterContentInit(): Promise<void> {
    this.audioElement = this.audioElementRef.nativeElement;

    navigator.mediaDevices.enumerateDevices().then(console.log);

    let musics;

    if (store.has('musicList')) {
      const musicList = store.get('musicList');
      musics = musicList.musics;
    } else {
      musics = await this.listFiles('\\\\DISKSTATION\\music');
      const md5 = createHash('md5').update(musics.join('')).digest('hex');
      store.set('musicList', { md5, musics });
      console.log('musics updated');
    }

    musics = musics.filter(m => /Journee.*m4/.test(m));

    console.log(musics);

    const context = new AudioContext();
    const nodeContext = new NodeAudioContext();
    const source = context.createBufferSource();
    const buffer = await readFileSync('C:\\Users\\Josselin\\Downloads\\3-02 C\'est Une Belle Journee.m4a');

    nodeContext.decodeAudioData(buffer, baseAudioBuffer => {
      const audioBuffer = context.createBuffer(baseAudioBuffer.numberOfChannels, baseAudioBuffer.length, baseAudioBuffer.sampleRate);
      const ch1 = audioBuffer.getChannelData(0);
      const ch2 = audioBuffer.getChannelData(1);

      for (let i = 0; i < baseAudioBuffer._data[0].length; i++) {
        ch1[i] = baseAudioBuffer._data[0][i];
        ch2[i] = baseAudioBuffer._data[1][i];
      }

      source.buffer = audioBuffer;
      source.connect(context.destination);
      // source.playbackRate.value = 2;
      // source.start(0);
    });

    // this.playMusic({ audio: musics[0], id: Date.now() });
  }

  private async listFiles(path: string): Promise<string[]> {
    if (lstatSync(path).isDirectory()) {
      const res = [];
      (await Promise.all<string[]>((await readdir(path)).map(async dir => this.listFiles(join(path, dir)))))
        .forEach(a => res.push(...a));
      return res;
    }
    return [path];
  }
}
