// animations.ts
import { animate, state, style, transition, trigger } from '@angular/animations';

export const expansionAnimation = trigger('expansionAnimation', [
  // État masqué (quand showSamplingStrata est false)
  state(
    'false',
    style({
      height: '0px',
      minHeight: '0px',
      opacity: 0,
      overflow: 'hidden',
    })
  ),

  // État visible (quand showSamplingStrata est true)
  state(
    'true',
    style({
      height: '*',
      opacity: 1,
      overflow: 'hidden',
    })
  ),

  // Transition entre les états
  transition('false <=> true', [animate('300ms ease-in-out')]),

  // Transition initiale (depuis void)
  transition('void => *', [
    style({
      height: '0px',
      minHeight: '0px',
      opacity: 0,
      overflow: 'hidden',
    }),
    animate('300ms ease-in-out'),
  ]),
]);
