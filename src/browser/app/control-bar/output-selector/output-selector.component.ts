import { Component, ElementRef, EventEmitter, Input, Output, Renderer2 } from '@angular/core';

import { PlayerState } from '../../../../shared/constants';
import { AudioApi } from '../../../../shared/interfaces';
import { MOUSE_BUTTON } from '../../shared/constants';
import { Logger, MusicPlayerService, NodeExecutorService } from '../../shared/services';
import { closest } from '../../shared/utils';

const logger = Logger.create('OutputSelectorComponent');

@Component({
  selector: 'app-output-selector',
  templateUrl: './output-selector.component.html',
  styleUrls: ['./output-selector.component.scss'],
})
export class OutputSelectorComponent {

  @Input()
  set showSelector(show: boolean) {
    if (this.shown !== show) {
      if (show) {
        // tslint:disable-next-line
        this.show();
      } else {
        this.hide();
      }
    }
  }

  @Output() close = new EventEmitter();

  activeApiId: number;
  apiList: AudioApi[];
  shown = false;

  private destroyMouseDownHandler: () => void;

  constructor(private hostElementRef: ElementRef,
              private musicPlayerService: MusicPlayerService,
              private nodeExecutorService: NodeExecutorService,
              private renderer: Renderer2) {}

  hide(): void {
    logger.debug('hide()');
    this.shown = false;

    if (typeof this.destroyMouseDownHandler === 'function') {
      this.destroyMouseDownHandler();
    }
  }

  async select(api: AudioApi): Promise<void> {
    logger.debug('select():', api.name);

    if (api.id === this.activeApiId) {
      return;
    }

    try {
      const playerState = await this.musicPlayerService.getState();
      let time: number;

      if (playerState !== PlayerState.Stopped) {
        time = this.musicPlayerService.getCurrentTime();
      }

      await this.nodeExecutorService.exec('player', 'selectAudioAPI', [api]);
      this.activeApiId = api.id;
      this.close.emit();

      if (playerState !== PlayerState.Stopped) {
        await this.musicPlayerService.seek(time);
      }

    } catch (error) {
      logger.error(error);
    }
  }

  async show(): Promise<void> {
    logger.debug('show()');
    this.apiList = await await this.nodeExecutorService.exec('player', 'getAudioAPIList');
    const activeApi = await this.nodeExecutorService.exec('player', 'getActiveAudioAPI');
    this.activeApiId = activeApi !== undefined ? activeApi.id : this.apiList.find(api => api.default).id;
    this.shown = true;
    this.destroyMouseDownHandler = this.renderer.listen(this.hostElementRef.nativeElement, 'click', this.clickHandler.bind(this));
  }

  private clickHandler(event: MouseEvent): void {
    logger.debug('clickHandler()');

    if (![MOUSE_BUTTON.LEFT, MOUSE_BUTTON.RIGHT].includes(event.button)) {
      return;
    }
    if (closest(event.target as HTMLElement, '.output-selector') === undefined) {
      this.close.emit();
    }
  }
}
