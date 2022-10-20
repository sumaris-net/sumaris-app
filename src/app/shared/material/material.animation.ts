// import the required animation functions from the angular animations module
import { animate, state, style, transition, trigger } from '@angular/animations';

// TODO move this to ngx component ?
export const slideDownAnimation =
  // trigger name for attaching this animation to an element using the [@triggerName] syntax
  trigger('slideDownAnimation', [

    // end state styles for route container (host)
    state('*', style({
      transform: 'translateY(0)',
      opacity: 1
    })),

    // route 'enter' transition
    transition(':enter', [

      // styles at start of transition
      style({
        transform: 'translateY(-400%)',
        opacity: 0
      }),

      // animation and styles at end of transition
      animate('.3s ease-in-out', style({
        transform: 'translateY(0)',
        opacity: 1
      }))
    ]),

    // route 'leave' transition
    transition(':leave', [
      // animation and styles at end of transition
      style({
        transform: 'translateY(-400%)',
        opacity: 0
      })
    ])
  ]);
