import { Component, ElementRef, Input, Renderer2 } from '@angular/core';

import { Logger } from '../../services';

const TRANSITION_DURATION_MS = 150;

const logger = Logger.create('BackdropComponent');

@Component({
  selector: 'app-backdrop',
  templateUrl: './backdrop.component.html',
  styleUrls: ['./backdrop.component.scss'],
})
export class BackdropComponent {

  @Input('show')
  set showSetter(show: boolean) {
    if (this.shown !== show) {
      if (show) {
        this.show();
      } else {
        this.hide();
      }
    }
  }

  displayTimeout: number;
  shown = false;

  constructor(private hostElementRef: ElementRef,
              private renderer: Renderer2) {}

  hide(): void {
    logger.debug('hide()');

    this.shown = false;
    this.displayTimeout = window.setTimeout(() => {
      this.renderer.setStyle(this.hostElementRef.nativeElement, 'display', 'none');
      delete this.displayTimeout;
    }, TRANSITION_DURATION_MS);
  }

  show(): void {
    logger.debug('show()');

    if (this.displayTimeout !== undefined) {
      window.clearTimeout(this.displayTimeout);
    }

    this.renderer.setStyle(this.hostElementRef.nativeElement, 'display', 'block');
    this.shown = true;
  }
}
