import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { fadeInAnimation } from '@sumaris-net/ngx-components';
import { TripContextService } from '@app/trip/trip-context.service';
import { OperationPage } from '@app/trip/operation/operation.page';
import { OperationService } from '@app/trip/operation/operation.service';
import { Program } from '@app/referential/services/model/program.model';
import { RxState } from '@rx-angular/state';
import { ContextService } from '@app/shared/context.service';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';
import { BatchModelValidatorService } from '@app/trip/batch/tree/batch-model.validator';
import { AdvancedBatchModelValidatorService } from '@app/trip/batch/tree/advanced/advanced-batch-model.validator';
import { ContextUtils } from '@app/shared/context/context.utils';

@Component({
  selector: 'app-advanced-operation-page',
  templateUrl: './advanced-operation.page.html',
  styleUrls: ['../operation.page.scss'],
  animations: [fadeInAnimation],
  providers: [
    { provide: APP_DATA_ENTITY_EDITOR, useExisting: AdvancedOperationPage },
    { provide: ContextService, useExisting: TripContextService },
    { provide: BatchModelValidatorService, useExisting: AdvancedBatchModelValidatorService },
    RxState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvancedOperationPage extends OperationPage {
  get invalid(): boolean {
    // Allow batchTree to be invalid
    return this.opeForm?.invalid || this.measurementsForm?.invalid || this.sampleTree?.invalid || false;
  }

  constructor(injector: Injector, dataService: OperationService) {
    super(injector, dataService, {
      pathIdAttribute: 'advancedOperationId',
      tabCount: 3,
      settingsId: 'advanced-operation',
    });
  }

  async saveAndControl(event?: Event, opts?: { emitEvent?: false }): Promise<boolean> {
    if (this.batchTree.dirty) {
      await this.batchTree.save();
    }
    return super.saveAndControl(event, opts);
  }

  protected async setProgram(program: Program): Promise<void> {
    await super.setProgram(program);

    // Force suffix
    //this.i18nContext.suffix = 'ACCIDENTAL_CATCH.';

    // Force rankOrder to be recompute
    // this is required because batch tree container can generate same batch label, for individual sorting batch
    this.saveOptions.computeBatchRankOrder = true;
  }

  protected computePageUrl(id: number | 'new', tripId?: number): string | any[] {
    const parentUrl = this.getParentPageUrl();
    return parentUrl && `${parentUrl}/operation/advanced/${id}`;
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
