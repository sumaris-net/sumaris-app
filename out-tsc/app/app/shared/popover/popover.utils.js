import { __awaiter } from "tslib";
import { TextPopover } from '@sumaris-net/ngx-components';
export class Popovers {
    static showText(popoverController, event, opts, popoverOpts) {
        return __awaiter(this, void 0, void 0, function* () {
            const popover = yield popoverController.create(Object.assign({ component: TextPopover, componentProps: opts, backdropDismiss: false, keyboardClose: false, event, translucent: true, cssClass: 'popover-large' }, popoverOpts));
            yield popover.present();
            return popover.onDidDismiss();
        });
    }
}
//# sourceMappingURL=popover.utils.js.map