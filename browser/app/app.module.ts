import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BrowserComponent } from './browser/browser.component';
import { ControlBarComponent } from './control-bar/control-bar.component';
import { MusicListService } from './shared/music-list.service';
import { TitleBarComponent } from './title-bar/title-bar.component';

@NgModule({
  declarations: [
    AppComponent,
    ControlBarComponent,
    TitleBarComponent,
    BrowserComponent,
  ],
  imports: [
    BrowserModule,
  ],
  providers: [MusicListService],
  bootstrap: [AppComponent],
})
export class AppModule {
}
