// import the required animation functions from the angular animations module
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Animation, createAnimation } from '@ionic/core';

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

export const ionFadeInTransition = (
  _: HTMLElement,
  opts: {
    enteringEl: HTMLElement;
    leavingEl: HTMLElement | undefined;
  }
): Animation => {
  const baseAnimation = createAnimation();

  const enteringAnimation = createAnimation()
    .addElement(opts.enteringEl)
    .duration(500)
    .fromTo('opacity', 0, 1);

  if (opts.leavingEl) {
    const leavingAnimation = createAnimation()
      .addElement(opts.leavingEl)
      .duration(500)
      .fromTo('opacity', 1, 0);
    return baseAnimation.addAnimation([enteringAnimation, leavingAnimation]);
  }

  return baseAnimation.addAnimation(enteringAnimation);
};
