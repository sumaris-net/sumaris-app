import {ChangeDetectorRef, Component, Injector, Input, OnInit} from "@angular/core";
import {ModalController} from "@ionic/angular";
import {PlatformService}  from "@sumaris-net/ngx-components";
import {LocalSettingsService}  from "@sumaris-net/ngx-components";
import {TranslateService} from "@ngx-translate/core";
import {ExtractionType} from "../type/extraction-type.model";
import {isNotNilOrBlank} from "@sumaris-net/ngx-components";
import {AppHelpModal} from "@sumaris-net/ngx-components";

export interface ExtractionHelpModalOptions {
  type: ExtractionType;
}

@Component({
    selector: 'app-extraction-help-modal',
    templateUrl: 'help.modal.html'
})
export class ExtractionHelpModal extends AppHelpModal implements OnInit, ExtractionHelpModalOptions{

  @Input() type: ExtractionType;

  constructor(
      protected injector: Injector,
      protected viewCtrl: ModalController,
      protected platform: PlatformService,
      protected settings: LocalSettingsService,
      protected translate: TranslateService,
      protected cd: ChangeDetectorRef
  ) {
    super(injector, viewCtrl, platform, settings, translate, cd);
  }


  ngOnInit() {
    if (!this.type) throw new Error("Missing 'type' input");
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
}
