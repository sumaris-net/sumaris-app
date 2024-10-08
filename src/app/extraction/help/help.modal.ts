import { Component, Input, OnInit } from '@angular/core';
import { AppHelpModal, isNotNilOrBlank } from '@sumaris-net/ngx-components';
import { ExtractionType } from '../type/extraction-type.model';

export interface ExtractionHelpModalOptions {
  type: ExtractionType;
}

@Component({
  selector: 'app-extraction-help-modal',
  templateUrl: 'help.modal.html',
})
export class ExtractionHelpModal extends AppHelpModal implements OnInit, ExtractionHelpModalOptions {
  @Input() type: ExtractionType;

  constructor() {
    super();
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
    } else {
      this.markAsLoaded(); // Nothing to load
    }
  }
}
