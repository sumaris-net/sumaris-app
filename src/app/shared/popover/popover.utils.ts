import { TextPopover, TextPopoverOptions } from '@sumaris-net/ngx-components';
import { PopoverController, PopoverOptions } from '@ionic/angular';
import { OverlayEventDetail } from '@ionic/core';

export class Popovers {

  static async showText(popoverController: PopoverController,
                        event: Event,
                        opts: TextPopoverOptions,
                        popoverOpts?: PopoverOptions) : Promise<OverlayEventDetail> {
    const popover = await popoverController.create({
      component: TextPopover,
      componentProps: opts,
      backdropDismiss: false,
      keyboardClose: false,
      event,
      translucent: true,
      cssClass: 'popover-large',
      ...popoverOpts
    });

    await popover.present();
    return popover.onDidDismiss();
  }
}
