import { Directive, EmbeddedViewRef, Input, Renderer2, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({ selector: '[appShow]' })
export class ShowDirective {

  @Input()
  set appShow(show: boolean) {
    if (show) {
      if (this.embeddedViewRef === undefined) {
        this.viewContainer.clear();
        this.embeddedViewRef = this.viewContainer.createEmbeddedView(this.templateRef);
        this.renderer.addClass(this.embeddedViewRef.rootNodes[0], 'shown');
      } else if (this.hideTimeout !== undefined) {
        window.clearTimeout(this.hideTimeout);
        this.renderer.addClass(this.embeddedViewRef.rootNodes[0], 'shown');
      }
    } else {
      if (this.embeddedViewRef !== undefined) {
        this.renderer.removeClass(this.embeddedViewRef.rootNodes[0], 'shown');
      }

      this.hideTimeout = window.setTimeout(() => {
        this.viewContainer.clear();
        delete this.embeddedViewRef;
        delete this.hideTimeout;
      }, this.duration);
    }
  }

  @Input() duration: number = 100;

  private embeddedViewRef: EmbeddedViewRef<any> | undefined;
  private hideTimeout: number;

  constructor(private viewContainer: ViewContainerRef,
              private renderer: Renderer2,
              private templateRef: TemplateRef<any>) {}
}
