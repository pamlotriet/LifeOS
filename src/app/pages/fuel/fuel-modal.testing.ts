import { Component, ContentChild, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

/** Render modal content without running Ionic overlay animations in jsdom. */
@Component({
  selector: 'ion-modal',
  imports: [NgTemplateOutlet],
  inputs: ['isOpen', 'keepContentsMounted', 'breakpoints', 'initialBreakpoint', 'handle', 'canDismiss'],
  template: '<ng-container [ngTemplateOutlet]="content ?? null" />',
})
export class FuelModalStub {
  isOpen = true;
  keepContentsMounted = true;
  breakpoints: number[] | undefined;
  initialBreakpoint: number | undefined;
  handle = false;
  canDismiss = true;
  @ContentChild(TemplateRef) content?: TemplateRef<unknown>;
}
