import { Component } from '@angular/core';

const getCurrentElectronWindow = (window as any).getCurrentElectronWindow;

@Component({
  selector: 'app-title-bar',
  templateUrl: './title-bar.component.html',
  styleUrls: ['./title-bar.component.scss'],
})
export class TitleBarComponent {

  close(): void {
    getCurrentElectronWindow().close();
  }

  maximize(): void {
    const window = getCurrentElectronWindow();

    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  }

  minimize(): void {
    getCurrentElectronWindow().minimize();
  }
}
