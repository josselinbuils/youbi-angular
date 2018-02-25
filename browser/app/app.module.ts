import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BrowserComponent } from './browser/browser.component';
import { DetailsComponent } from './browser/details/details.component';
import { ControlBarComponent } from './control-bar/control-bar.component';
import { MusicManagerService, MusicPlayerService } from './shared';
import { TitleBarComponent } from './title-bar/title-bar.component';

@NgModule({
  declarations: [
    AppComponent,
    ControlBarComponent,
    DetailsComponent,
    TitleBarComponent,
    BrowserComponent,
  ],
  imports: [
    BrowserModule,
  ],
  providers: [
    MusicManagerService,
    MusicPlayerService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
}
