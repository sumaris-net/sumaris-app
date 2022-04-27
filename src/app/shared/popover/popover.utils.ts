import { TextPopover, TextPopoverOptions } from '@sumaris-net/ngx-components';
import { PopoverController, PopoverOptions } from '@ionic/angular';
import { OverlayEventDetail } from '@ionic/core';

export class Popovers {

  static async showText(popoverController: PopoverController,
                        event: UIEvent,
                        opts: TextPopoverOptions,
                        popoverOpts?: PopoverOptions) : Promise<OverlayEventDetail> {
    const modal = await popoverController.create({
      component: TextPopover,
      componentProps: opts,
      backdropDismiss: false,
      keyboardClose: false,
      event,
      translucent: true,
      cssClass: 'popover-large',
      ...popoverOpts
    });

    await modal.present();
    return await modal.onDidDismiss();
  }
}
