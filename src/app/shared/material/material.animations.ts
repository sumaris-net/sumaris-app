// animations.ts
import { animate, state, style, transition, trigger } from '@angular/animations';

export const expansionInOutAnimation = trigger('expansionInOutAnimation', [
  state(
    'collapsed',
    style({
      height: '0px',
      minHeight: '0px',
      opacity: 0,
      overflow: 'hidden',
    })
  ),
  state(
    'expanded',
    style({
      height: '*',
      opacity: 1,
      overflow: 'hidden',
    })
  ),
  transition('collapsed <=> expanded', [animate('300ms ease-in-out')]),
]);
