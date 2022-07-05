import { ChangeDetectionStrategy, Component, Injector, QueryList, ViewChildren } from '@angular/core';
import { fadeInOutAnimation, InputElement } from '@sumaris-net/ngx-components';
import { APP_ENTITY_EDITOR } from '@app/data/quality/entity-quality-form.component';
import { ContextService } from '@app/shared/context.service';
import { TripContextService } from '@app/trip/services/trip-context.service';
import { IonRouterOutlet } from '@ionic/angular';
import { OperationPage } from '@app/trip/operation/operation.page';
import { OperationService } from '@app/trip/services/operation.service';
import { Operation } from '@app/trip/services/model/trip.model';
import { BatchTreeComponent } from '@app/trip/batch/batch-tree.component';
import { Program } from '@app/referential/services/model/program.model';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { PmfmIds, QualitativeValueIds } from '@app/referential/services/model/model.enum';
import { PmfmValueUtils } from '@app/referential/services/model/pmfm-value.model';
import { BatchTreeWrapperComponent } from '@app/trip/operation/selectivity/batch-tree-wrapper.component';

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

  gearPositions = [
    {label: 'B', name: 'Bâbord', id: QualitativeValueIds.BATCH_GEAR_POSITION.PORT},
    //{label:'T', name: 'Tribord', id: QualitativeValueIds.BATCH_GEAR_POSITION.STARBOARD}
  ];

  constructor(injector: Injector,
              dataService: OperationService) {
    super(injector, dataService, {
      //tabCount: 4
    });

  }

  protected registerForms() {
    // Register sub forms & table
    this.addChildForms([
      this.opeForm,
      this.measurementsForm
    ]);

  }

  ngAfterViewInit() {
    super.ngAfterViewInit();

    let delegates = [];
    this.subBatchTrees.forEach((batchTree, index) => {
      this.addChildForm(batchTree);
      delegates.push(batchTree);
      const gearPosition = this.gearPositions[index];
      const measurementValues = {};
      measurementValues[PmfmIds.BATCH_GEAR_POSITION] = gearPosition.id.toString();
      const filter = BatchFilter.fromObject({
        measurementValues
      });
      batchTree.setFilter(filter);
    });
  }

  protected async onMeasurementsFormReady(): Promise<void> {
    await super.onMeasurementsFormReady();


  }

  protected updateTablesState() {
    //if (this.showCatchTab) this.tabCount++;
    this.tabCount = 3;

    super.updateTablesState();
  }

  protected async setProgram(program: Program): Promise<void> {
    await super.setProgram(program);

    this.i18nContext.suffix = 'SELECTIVITY.';

    this.subBatchTrees.forEach(batchTree => {
      batchTree.program = program;
    });

  }


  protected async getValue(): Promise<Operation> {
    const data = await super.getValue();

    // TODO


    return data;
  }
}
