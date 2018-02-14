import { Component } from '@angular/core';

@Component({
  selector: 'app-control-bar',
  templateUrl: './control-bar.component.html',
  styleUrls: ['./control-bar.component.scss'],
})
export class ControlBarComponent {

  played = true;

  next() {}

  play() {}

  prev() {}

  startSeek() {}
}
