import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { fadeInOutAnimation } from '@sumaris-net/ngx-components';
import { TripContextService } from '@app/trip/trip-context.service';
import { OperationPage } from '@app/trip/operation/operation.page';
import { OperationService } from '@app/trip/operation/operation.service';
import { Program } from '@app/referential/services/model/program.model';
import { RxState } from '@rx-angular/state';
import { ContextService } from '@app/shared/context.service';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';
import { BatchModelValidatorService } from '@app/trip/batch/tree/batch-model.validator';
import { SelectivityBatchModelValidatorService } from '@app/trip/batch/tree/selectivity/selectivity-batch-model.validator';

@Component({
  selector: 'app-selectivity-operation-page',
  templateUrl: './selectivity-operation.page.html',
  styleUrls: ['../operation.page.scss'],
  animations: [fadeInOutAnimation],
  providers: [
    { provide: APP_DATA_ENTITY_EDITOR, useExisting: SelectivityOperationPage },
    { provide: ContextService, useExisting: TripContextService },
    { provide: BatchModelValidatorService, useExisting: SelectivityBatchModelValidatorService },
    RxState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectivityOperationPage extends OperationPage {
  get invalid(): boolean {
    // Allow batchTree to be invalid, if on field mode
    return this.opeForm?.invalid || this.measurementsForm?.invalid || (!this.isOnFieldMode && this.batchTree.invalid) || false;
  }

  constructor(injector: Injector, dataService: OperationService) {
    super(injector, dataService, {
      pathIdAttribute: 'selectivityOperationId',
      tabCount: 2,
      settingsId: 'selectivity-operation',
    });
  }

  protected registerForms() {
    // Register sub forms & table
    this.addChildForms([this.opeForm, this.measurementsForm, this.batchTree]);
  }

  onNewFabButtonClick(event: Event) {
    const selectedTabIndex = this.selectedTabIndex;
    if (selectedTabIndex === OperationPage.TABS.CATCH) {
      this.batchTree.addRow(event);
    } else {
      super.onNewFabButtonClick(event);
    }
  }

  get showFabButton(): boolean {
    return false;
  }

  async saveAndControl(event?: Event, opts?: { emitEvent?: false }): Promise<boolean> {
    if (this.batchTree.dirty) {
      await this.batchTree.save();
    }
    return super.saveAndControl(event, opts);
  }

  protected updateTablesState() {
    this.tabCount = this.showCatchTab ? 2 : 1;

    super.updateTablesState();
  }

  protected async setProgram(program: Program): Promise<void> {
    await super.setProgram(program);

    // Force suffix
    this.i18nContext.suffix = 'TRAWL_SELECTIVITY.';

    // Force rankOrder to be recompute
    // this is required because batch tree container can generate same batch label, for individual sorting batch
    this.saveOptions.computeBatchRankOrder = true;
  }

  protected computePageUrl(id: number | 'new', tripId?: number): string | any[] {
    const parentUrl = this.getParentPageUrl();
    return parentUrl && `${parentUrl}/operation/selectivity/${id}`;
  }

  protected getFirstInvalidTabIndex(): number {
    // find invalids tabs (keep order)
    const invalidTabs = [this.opeForm.invalid || this.measurementsForm.invalid, (this.showCatchTab && this.batchTree?.invalid) || false];

    // Open the first invalid tab
    const invalidTabIndex = invalidTabs.indexOf(true);

    // If catch tab, open the invalid sub tab
    if (invalidTabIndex === OperationPage.TABS.CATCH) {
      this.selectedSubTabIndex = this.batchTree?.getFirstInvalidTabIndex();
      this.updateTablesState();
    }
    return invalidTabIndex;
  }
}
