import { ChangeDetectorRef, Component, OnInit } from '@angular/core';

const getCurrentElectronWindow = (window as any).getCurrentElectronWindow;

@Component({
  selector: 'app-title-bar',
  templateUrl: './title-bar.component.html',
  styleUrls: ['./title-bar.component.scss'],
})
export class TitleBarComponent implements OnInit {

  active: boolean;
  maximized: boolean;

  private window = getCurrentElectronWindow();

  constructor(private changeDetectorRef: ChangeDetectorRef) {
    this.active = this.window.isFocused();
    this.maximized = this.window.isMaximized();
  }

  close(): void {
    this.window.close();
  }

  maximize(): void {
    if (this.maximized) {
      this.window.unmaximize();
    } else {
      this.window.maximize();
    }
  }

  minimize(): void {
    this.window.minimize();
  }

  ngOnInit(): void {
    const set = (property: string, value: boolean) => {
      this[property] = value;
      this.changeDetectorRef.detectChanges();
    };
    this.window.on('blur', () => set('active', false));
    this.window.on('focus', () => set('active', true));
    this.window.on('maximize', () => set('maximized', true));
    this.window.on('unmaximize', () => set('maximized', false));
  }
}
