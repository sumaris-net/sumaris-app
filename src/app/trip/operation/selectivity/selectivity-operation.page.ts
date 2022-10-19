import { ChangeDetectionStrategy, Component, Injector } from '@angular/core';
import { fadeInOutAnimation } from '@sumaris-net/ngx-components';
import { APP_ENTITY_EDITOR } from '@app/data/quality/entity-quality-form.component';
import { ContextService } from '@app/shared/context.service';
import { TripContextService } from '@app/trip/services/trip-context.service';
import { IonRouterOutlet } from '@ionic/angular';
import { OperationPage } from '@app/trip/operation/operation.page';
import { OperationService } from '@app/trip/services/operation.service';
import { Program } from '@app/referential/services/model/program.model';


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
export class SelectivityOperationPage extends OperationPage {

  constructor(injector: Injector,
              dataService: OperationService) {
    super(injector, dataService, {
      pathIdAttribute: 'selectivityOperationId',
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
        .subscribe(g => {
          this.batchTree.gearId = g && g.gear?.id;
          this.batchTree.physicalGearId = g?.id;
        })
    )
  }

  onNewFabButtonClick(event: UIEvent) {
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
    //if (this.showCatchTab) this.tabCount++;
    this.tabCount = 3;

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
}
