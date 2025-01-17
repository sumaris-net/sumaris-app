import { ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import {
  AppMarkdownModal,
  isNotNilOrBlank,
  LocalSettingsService,
  NetworkService,
  PlatformService,
  UriUtils,
  UrlUtils,
} from '@sumaris-net/ngx-components';
import { TranslateService } from '@ngx-translate/core';
import { ExtractionType } from '../type/extraction-type.model';

export interface ExtractionHelpModalOptions {
  type: ExtractionType;
}

@Component({
  selector: 'app-extraction-help-modal',
  templateUrl: 'help.modal.html',
})
export class ExtractionHelpModal extends AppMarkdownModal implements OnInit, ExtractionHelpModalOptions {
  @Input() type: ExtractionType;

  constructor(
    injector: Injector,
    viewCtrl: ModalController,
    platform: PlatformService,
    settings: LocalSettingsService,
    translate: TranslateService,
    network: NetworkService,
    cd: ChangeDetectorRef
  ) {
    super(injector, viewCtrl, platform, settings, translate, network, cd);
  }

  ngOnInit() {
    if (!this.type) throw new Error("Missing 'type' input");
    this.title = this.type.name;

    console.debug('[extraction-help-modal] Show help modal for type:', this.type);
    if (isNotNilOrBlank(this.type.description)) {
      const subtitle = this.translate.instant('EXTRACTION.HELP.MODAL.DESCRIPTION');
      this.data = `# ${subtitle}\n\n${this.type.description}\n\n`;
    }
    if (this.type.docUrl) {
      this.markAsLoading();

      let url = this.type.docUrl;

      // Make sure URL is on a markdown file (add extension .md if need)
      const filename = UriUtils.getFilename(url);
      if (filename && !filename.endsWith('.md')) {
        const fragment = UrlUtils.getFragment(url);
        url = UrlUtils.stripFragmentAndQuery(url) + '.md' + (fragment ? '#' + fragment : '');
      }
      this.src = url;
    } else {
      // Nothing to load
      this.markAsLoaded();
    }
  }
}
