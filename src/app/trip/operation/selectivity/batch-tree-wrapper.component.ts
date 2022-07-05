import { ChangeDetectionStrategy, Component, Injector, Input, QueryList, ViewChildren } from '@angular/core';
import { AppForm, fadeInOutAnimation, InputElement } from '@sumaris-net/ngx-components';
import { APP_ENTITY_EDITOR } from '@app/data/quality/entity-quality-form.component';
import { ContextService } from '@app/shared/context.service';
import { TripContextService } from '@app/trip/services/trip-context.service';
import { IonRouterOutlet } from '@ionic/angular';
import { OperationPage } from '@app/trip/operation/operation.page';
import { OperationService } from '@app/trip/services/operation.service';
import { Operation } from '@app/trip/services/model/trip.model';
import { BatchTreeComponent, IBatchTreeComponent } from '@app/trip/batch/batch-tree.component';
import { Batch } from '@app/trip/batch/common/batch.model';
import { IBatchGroupModalOptions } from '@app/trip/batch/group/batch-group.modal';

@Component({
  selector: 'app-batch-tree-merge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``
})

export class BatchTreeMerge implements IBatchTreeComponent {

  @Input() delegates;

  constructor() {
  }

  setValue(data: Batch, opts) {
    // TODO
  }

  setModalOption(key: keyof IBatchGroupModalOptions, value: IBatchGroupModalOptions[typeof key]) {
    // TODO
    //this.batchGroupsTable.setModalOption(key, value);
  }

  setSelectedTabIndex(value: number) {

  }

  realignInkBar() {

  }

  protected async getValue(): Promise<Batch> {
    const data = new Batch();

    // TODO


    return data;
  }
}
