import {ChangeDetectionStrategy, Component, Injector} from '@angular/core';
import {DateUtils, fadeInOutAnimation, isEmptyArray, isNil} from '@sumaris-net/ngx-components';
import {APP_ENTITY_EDITOR} from '@app/data/quality/entity-quality-form.component';
import {ContextService} from '@app/shared/context.service';
import {TripContextService} from '@app/trip/services/trip-context.service';
import {IonRouterOutlet} from '@ionic/angular';
import {OperationPage, OperationState} from '@app/trip/operation/operation.page';
import {OperationService} from '@app/trip/services/operation.service';
import {Program} from '@app/referential/services/model/program.model';
import {IPmfm, PmfmUtils} from '@app/referential/services/model/pmfm.model';
import moment from 'moment';
import {environment} from '@environments/environment';
import {BatchTreeContainerComponent, PrepareModelEvent} from '@app/trip/batch/tree/batch-tree-container.component';
import {BatchModel, BatchModelUtils} from '@app/trip/batch/tree/batch-tree.model';
import {filter} from 'rxjs/operators';
import {PmfmIds, QualitativeValueIds} from '@app/referential/services/model/model.enum';
import {RxState} from '@rx-angular/state';
import {MapPmfmEvent, UpdateFormGroupEvent} from '@app/trip/measurement/measurements.form.component';

export interface SelectivityOperationState extends OperationState {
  batchModel: BatchModel;
}

@Component({
  selector: 'app-selectivity-operation-page',
  templateUrl: './selectivity-operation.page.html',
  styleUrls: ['../operation.page.scss'],
  animations: [fadeInOutAnimation],
  providers: [
    { provide: APP_ENTITY_EDITOR, useExisting: SelectivityOperationPage },
    { provide: ContextService, useExisting: TripContextService},
    {
      provide: IonRouterOutlet,
      useValue: {
        // Tweak the IonRouterOutlet if this component shown in a modal
        canGoBack: () => false,
        nativeEl: '',
      },
    },
    RxState
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectivityOperationPage extends OperationPage<SelectivityOperationState> {

  constructor(injector: Injector,
              dataService: OperationService) {
    super(injector, dataService, {
      pathIdAttribute: 'selectivityOperationId',
    });

    // FOR DEV ONLY ----
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    this._state.hold(
      this._state.select(['hasIndividualMeasures', 'batchModel'], ({hasIndividualMeasures, batchModel}) => {
        if (isNil(hasIndividualMeasures) || !batchModel) {
          console.debug('[selectivity-operation] Missing required argument. Skipping', {hasIndividualMeasures, batchModel});
          return undefined;
        }

        // Configure batch model
        const discardBatchModels = BatchModelUtils.findInTree(batchModel, {
          measurementValues: {
            [PmfmIds.DISCARD_OR_LANDING]: QualitativeValueIds.DISCARD_OR_LANDING.DISCARD.toString()
          }});

        if (isEmptyArray(discardBatchModels)) return false;

        discardBatchModels.forEach(discardNode => {
          discardNode.hidden = !hasIndividualMeasures;
        })
        return true;
      })
      .pipe(filter(value => value === true)),
      async (_) => {
        await (this.batchTree as BatchTreeContainerComponent).refresh();
      }
    );
  }

  protected registerForms() {
    // Register sub forms & table
    this.addChildForms([
      this.opeForm,
      this.measurementsForm,
      this.batchTree
    ]);
  }

  protected async mapPmfms(event: MapPmfmEvent) {
    console.log('TODO mapPmfms');
    if (!event || !event.detail.success) return; // Skip (missing callback)
    let pmfms: IPmfm[] = event.detail.pmfms;

    // If PMFM date/time, set default date, in on field mode
    if (this.isNewData && this.isOnFieldMode && pmfms?.some(PmfmUtils.isDate)) {
      pmfms = pmfms.map(p => {
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
    }
    else {
      super.onNewFabButtonClick(event)
    }
  }

  get showFabButton(): boolean {
    if (!this._enabled) return false;
    switch (this._selectedTabIndex) {
      case OperationPage.TABS.CATCH:
        return this.batchTree.showBatchTables;
      default:
        return false;
    }
  }

  protected updateTablesState() {
    this.tabCount = this.showCatchTab ? 2 : 1;

    super.updateTablesState();
  }

  protected async setProgram(program: Program): Promise<void> {
    await super.setProgram(program);

    // Force suffix
    this.i18nContext.suffix = 'TRAWL_SELECTIVITY.';
  }

  protected computePageUrl(id: number | 'new'): string | any[] {
    const parentUrl = this.getParentPageUrl();
    return parentUrl && `${parentUrl}/operation/selectivity/${id}`;
  }

  protected async onPrepareModel(event: PrepareModelEvent) {
    try {
      const model = event.detail.model;
      if (!model) throw new Error('Missing model in \'event.detail\'');

      this._state.set('batchModel', (_) => model);

      // Promise success
      event.detail.success(model);
    }
    catch (err) {
      event.detail.error(err);
    }
  }


}
