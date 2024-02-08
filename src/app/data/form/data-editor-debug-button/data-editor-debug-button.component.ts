import { Component, Inject } from '@angular/core';
import { AppDataEntityEditor } from '@app/data/form/data-editor.class';
import { NetworkService } from '@sumaris-net/ngx-components';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';

@Component({
  selector: 'app-data-editor-debug-button',
  templateUrl: './data-editor-debug-button.component.html',
  styleUrls: ['./data-editor-debug-button.component.scss'],
})
export class AppDataEditorDebugButtonComponent {
  constructor(@Inject(APP_DATA_ENTITY_EDITOR) protected editor: AppDataEntityEditor<any>, protected network: NetworkService) {}

  toggleOfflineMode() {
    if (this.network.offline) {
      this.network.setForceOffline(false);
    } else {
      this.network.setForceOffline();
    }
  }
}
