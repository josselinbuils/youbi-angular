import { Component, OnInit } from '@angular/core';
import * as Mousetrap from 'mousetrap';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  ngOnInit(): void {
    Mousetrap.bind(['command+d', 'ctrl+d'], () => {
      (window as any).getCurrentElectronWindow().webContents.openDevTools();
      return false;
    });
  }
}
