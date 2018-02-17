import { Component } from '@angular/core';

const remote = window.require('electron').remote;

@Component({
  selector: 'app-title-bar',
  templateUrl: './title-bar.component.html',
  styleUrls: ['./title-bar.component.scss'],
})
export class TitleBarComponent {

  close(): void {
    remote.getCurrentWindow().close();
  }

  maximize(): void {
    const window = remote.getCurrentWindow();

    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  }

  minimize(): void {
    remote.getCurrentWindow().minimize();
  }
}
