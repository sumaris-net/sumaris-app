import { ChangeDetectionStrategy, Component, inject, Injector } from '@angular/core';
import { DateUtils, fadeInOutAnimation, PlatformService } from '@sumaris-net/ngx-components';
import { TripContextService } from '@app/trip/trip-context.service';
import { OperationPage } from '@app/trip/operation/operation.page';
import { OperationService } from '@app/trip/operation/operation.service';
import { Program } from '@app/referential/services/model/program.model';
import { IPmfm, PmfmUtils } from '@app/referential/services/model/pmfm.model';
import moment from 'moment';
import { RxState } from '@rx-angular/state';
import { MapPmfmEvent, UpdateFormGroupEvent } from '@app/data/measurement/measurements.form.component';
import { ContextService } from '@app/shared/context.service';
import { APP_DATA_ENTITY_EDITOR } from '@app/data/form/data-editor.utils';

@Component({
  selector: 'app-advanced-operation-page',
  templateUrl: './advanced-operation.page.html',
  styleUrls: ['../operation.page.scss'],
  animations: [fadeInOutAnimation],
  providers: [
    { provide: APP_DATA_ENTITY_EDITOR, useExisting: AdvancedOperationPage },
    { provide: ContextService, useExisting: TripContextService },
    RxState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdvancedOperationPage extends OperationPage {
  protected readonly platformService = inject(PlatformService);
  protected smallScreen: boolean;

  get invalid(): boolean {
    // Allow batchTree to be invalid
    return this.opeForm?.invalid || this.measurementsForm?.invalid || false;
  }

  constructor(injector: Injector, dataService: OperationService) {
    super(injector, dataService, {
      pathIdAttribute: 'advancedOperationId',
      tabCount: 2,
      settingsId: 'advanced-operation',
    });
    this.smallScreen = this.platformService.mobile && !this.platformService.is('tablet');
  }

  protected registerForms() {
    // Register sub forms & table
    this.addChildForms([this.opeForm, this.measurementsForm, this.batchTree]);
  }

  protected async mapPmfms(event: MapPmfmEvent) {
    if (!event || !event.detail.success) return; // Skip (missing callback)
    let pmfms: IPmfm[] = event.detail.pmfms;

    // If PMFM date/time, set default date, in on field mode
    if (this.isNewData && this.isOnFieldMode && pmfms?.some(PmfmUtils.isDate)) {
      pmfms = pmfms.map((p) => {
        if (PmfmUtils.isDate(p)) {
          p = p.clone();
          p.defaultValue = DateUtils.markNoTime(DateUtils.resetTime(moment()));
        }
        return p;
      });
    }

    event.detail.success(pmfms);
  }

  protected updateFormGroup(event: UpdateFormGroupEvent) {
    event.detail.success();
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
