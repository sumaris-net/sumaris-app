import { ChangeDetectionStrategy, Component, Injector, QueryList, ViewChildren } from '@angular/core';
import { fadeInOutAnimation, firstNotNilPromise, InputElement, IReferentialRef, isNil, isNotEmptyArray, ReferentialRef, waitFor } from '@sumaris-net/ngx-components';
import { APP_ENTITY_EDITOR } from '@app/data/quality/entity-quality-form.component';
import { ContextService } from '@app/shared/context.service';
import { TripContextService } from '@app/trip/services/trip-context.service';
import { IonRouterOutlet } from '@ionic/angular';
import { OperationPage } from '@app/trip/operation/operation.page';
import { OperationService } from '@app/trip/services/operation.service';
import { Operation } from '@app/trip/services/model/trip.model';
import { BatchTreeComponent } from '@app/trip/batch/tree/batch-tree.component';
import { Program } from '@app/referential/services/model/program.model';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { AcquisitionLevelCodes, GearIds, PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { BatchTreeContainerComponent } from '@app/trip/batch/tree/batch-tree-container.component';
import { PhysicalGear } from '@app/trip/physicalgear/physical-gear.model';
import { Batch } from '@app/trip/batch/common/batch.model';


export interface ICatchTabDef {
  id: number;
  label: string;
  filter?: BatchFilter
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class SelectivityOperationPage
  extends OperationPage {

  @ViewChildren('subBatchTree') subBatchTrees !: QueryList<BatchTreeComponent>;

  catchTabDefs: ICatchTabDef[] = [];

  constructor(injector: Injector,
              dataService: OperationService) {
    super(injector, dataService, {
      pathIdAttribute: 'selectivityOperationId'
    });
    //this.debug = false;
  }

  protected registerForms() {
    // Register sub forms & table
    this.addChildForms([
      this.opeForm,
      this.measurementsForm,
      this.batchTree
    ]);
  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    // Listen physical gears, to enable tabs
    this.registerSubscription(
      this.opeForm.physicalGearControl.valueChanges
        .subscribe(g => this.configureTabs(g))
    )
  }

  onNewFabButtonClick(event: UIEvent) {
    const selectedTabIndex = this.selectedTabIndex;
    if (selectedTabIndex >= OperationPage.TABS.CATCH) {
      const batchTree = this.subBatchTrees.get(selectedTabIndex - OperationPage.TABS.CATCH);
      if (batchTree) batchTree.addRow(event);
    }
    else {
      super.onNewFabButtonClick(event)
    }
  }

  protected updateTablesState() {
    //if (this.showCatchTab) this.tabCount++;
    this.tabCount = 3;

    super.updateTablesState();
  }

  protected async setProgram(program: Program): Promise<void> {
    await super.setProgram(program);

    // Force suffix
    this.i18nContext.suffix = 'TRAWL_SELECTIVITY.';
  }

  protected async configureTabs(physicalGear: PhysicalGear) {

    const gearId = physicalGear?.gear?.id;

    // No physical gear selected
    if (isNil(gearId)) {
      // Clean existing tabs
      if (isNotEmptyArray(this.catchTabDefs)) {
        this.subBatchTrees.forEach(subBatchTree => this.batchTree.removeChildTree(subBatchTree));
        this.catchTabDefs = [];
      }
      return;
    }

    const touched = this.batchTree.touched;

    // Try to save data, if need
    const dirty = this.batchTree.dirty;
    if (dirty) {
      try {
        await this.batchTree.save();
      }
      catch (err) {
        // Log then continue
        console.error(err && err.message || err);
      }
    }

    // Remember existing data, to reapply later (avoid data lost)
    const data = this.batchTree.value;

    // Load pmfms for batches
    const programLabel = await firstNotNilPromise(this.$programLabel, {stop: this.destroySubject});
    const pmfms = await this.programRefService.loadProgramPmfms(programLabel, {
      gearId, acquisitionLevel: AcquisitionLevelCodes.SORTING_BATCH
    });

    // Has gear position pmfm
    let tabs: ICatchTabDef[];
    const gearPositionPmfm = (pmfms || []).find(p => p.id === PmfmIds.BATCH_GEAR_POSITION);
    if (isNotEmptyArray(gearPositionPmfm?.qualitativeValues)) {

      // Create a catch tab, for each position
      tabs = gearPositionPmfm.qualitativeValues.map(qv => {
        const measurementValues = {};
        measurementValues[gearPositionPmfm.id.toString()] = qv.id.toString();
        return <ICatchTabDef>{
          id: qv.id,
          label: this.translate.instant('TRIP.OPERATION.EDIT.TRAWL_SELECTIVITY.TAB_CATCH_POSITION', {name: qv.name}),
          filter: BatchFilter.fromObject({measurementValues})
        }
      });
    }

    // Create only one catch tab
    else {
      tabs = [{ id: -1, label: 'TRIP.OPERATION.EDIT.TAB_CATCH', filter: null}];
    }

    if (this.batchTree.gearId === gearId && this.catchTabDefs?.length === tabs.length) {
      return; // SKip if no changes
    }

    // Remove old trees
    this.subBatchTrees.forEach(subBatchTree => this.batchTree.removeChildTree(subBatchTree));

    // Update tabs
    this.catchTabDefs = tabs;

    // Wait end of tabs creation
    this.cd.detectChanges();
    await waitFor(() => this.subBatchTrees.length === this.catchTabDefs.length);

    // Register each sub batch tree to the main container
    this.subBatchTrees.forEach(subBatchTree => {
      this.batchTree.addChildTree(subBatchTree);
    });

    // Re apply data
    this.batchTree.markAsReady();
    if (data) {
      await this.batchTree.setValue(data);
      this.batchTree.markAsLoaded();
    }
    if (this.enabled) this.batchTree.enable();
    if (dirty) this.batchTree.markAsDirty();
    if (touched) this.batchTree.markAllAsTouched();
  }

  trackCatchTabDefFn(index: number, tab: ICatchTabDef): any {
    return tab.id;
  }

  protected getFirstInvalidTabIndex(): number {
    // find invalids tabs (keep order)
    const invalidTabs = [
      this.opeForm.invalid || this.measurementsForm.invalid,
      this.showCatchTab && this.batchTree?.invalid || false
    ];

    // Open the first invalid tab
    let invalidTabIndex = invalidTabs.indexOf(true);

    // If catch tab, open the invalid sub tab
    if (invalidTabIndex === OperationPage.TABS.CATCH) {
      let found = false;
      this.subBatchTrees.forEach((subBatchTree, index) => {
        if (!found && subBatchTree.invalid) {
          invalidTabIndex += index;
          this.selectedSubTabIndex = subBatchTree?.getFirstInvalidTabIndex();
          found = true;
        }
      });
      this.updateTablesState();
    }

    return invalidTabIndex;
  }

  protected computePageUrl(id: number | 'new'): string | any[] {
    const parentUrl = this.getParentPageUrl();
    return parentUrl && `${parentUrl}/operation/selectivity/${id}`;
  }
}
