import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { BrowserComponent } from './browser/browser.component';
import { DetailsComponent } from './browser/details/details.component';
import { ControlBarComponent } from './control-bar/control-bar.component';
import { OutputSelectorComponent } from './control-bar/output-selector/output-selector.component';
import { BackdropComponent } from './shared/components';
import { MusicManagerService, MusicPlayerService } from './shared/services';
import { TitleBarComponent } from './title-bar/title-bar.component';

@NgModule({
  declarations: [
    AppComponent,
    BackdropComponent,
    BrowserComponent,
    ControlBarComponent,
    DetailsComponent,
    OutputSelectorComponent,
    TitleBarComponent,
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
