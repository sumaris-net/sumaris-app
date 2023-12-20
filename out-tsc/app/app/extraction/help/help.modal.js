import { __decorate, __metadata } from "tslib";
import { ChangeDetectorRef, Component, Injector, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PlatformService } from '@sumaris-net/ngx-components';
import { LocalSettingsService } from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import { ExtractionType } from '../type/extraction-type.model';
import { isNotNilOrBlank } from '@sumaris-net/ngx-components';
import { AppHelpModal } from '@sumaris-net/ngx-components';
let ExtractionHelpModal = class ExtractionHelpModal extends AppHelpModal {
    constructor(injector, viewCtrl, platform, settings, translate, cd) {
        super(injector, viewCtrl, platform, settings, translate, cd);
        this.injector = injector;
        this.viewCtrl = viewCtrl;
        this.platform = platform;
        this.settings = settings;
        this.translate = translate;
        this.cd = cd;
    }
    ngOnInit() {
        if (!this.type)
            throw new Error('Missing \'type\' input');
        this.title = this.type.name;
        console.debug('[extraction-help-modal] Show help modal for type:', this.type);
        if (isNotNilOrBlank(this.type.description)) {
            const subtitle = this.translate.instant('EXTRACTION.HELP.MODAL.DESCRIPTION');
            this.markdownContent = `# ${subtitle}\n\n${this.type.description}\n\n`;
        }
        if (this.type.docUrl) {
            this.loading = true;
            let url = this.type.docUrl;
            if (url && !url.endsWith('.md')) {
                url += '.md';
            }
            this.markdownUrl = url;
        }
        else {
            this.markAsLoaded(); // Nothing to load
        }
    }
};
__decorate([
    Input(),
    __metadata("design:type", ExtractionType)
], ExtractionHelpModal.prototype, "type", void 0);
ExtractionHelpModal = __decorate([
    Component({
        selector: 'app-extraction-help-modal',
        templateUrl: 'help.modal.html'
    }),
    __metadata("design:paramtypes", [Injector,
        ModalController,
        PlatformService,
        LocalSettingsService,
        TranslateService,
        ChangeDetectorRef])
], ExtractionHelpModal);
export { ExtractionHelpModal };
//# sourceMappingURL=help.modal.js.map