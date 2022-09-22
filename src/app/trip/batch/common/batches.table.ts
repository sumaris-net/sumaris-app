import { ChangeDetectionStrategy, Component, Injector, Input } from '@angular/core';
import { InMemoryEntitiesService } from '@sumaris-net/ngx-components';
import { Batch } from './batch.model';
import { BatchFilter } from '@app/trip/batch/common/batch.filter';
import { AbstractBatchesTable } from '@app/trip/batch/common/batches.table.class';
import { BatchValidatorService } from '@app/trip/batch/common/batch.validator';
import { BatchModal, IBatchModalOptions } from '@app/trip/batch/common/batch.modal';
import { IBatchGroupModalOptions } from '@app/trip/batch/group/batch-group.modal';

export const BATCH_RESERVED_START_COLUMNS: string[] = ['taxonGroup', 'taxonName', 'weight'];

@Component({
  selector: 'app-batches-table',
  templateUrl: 'batches.table.html',
  styleUrls: ['batches.table.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {provide: BatchValidatorService, useClass: BatchValidatorService}
  ]
})
export class BatchesTable extends AbstractBatchesTable<Batch>{

  @Input() modalOptions: Partial<IBatchModalOptions>;
  @Input() compactFields = true;

  constructor(
    injector: Injector,
    validatorService: BatchValidatorService
  ) {
    super(injector,
      Batch,
      BatchFilter,
      new InMemoryEntitiesService(Batch, BatchFilter),
      validatorService, {
        reservedStartColumns: BATCH_RESERVED_START_COLUMNS
      }
    );
  }

  setModalOption(key: keyof IBatchGroupModalOptions, value: IBatchGroupModalOptions[typeof key]) {
    this.modalOptions = this.modalOptions || {};
    this.modalOptions[key as any] = value;
  }

  async setValue(data: Batch, opts?: {emitEvent?: boolean}): Promise<void> {

  }

  /* -- protected methods  -- */

  protected async openDetailModal(dataToOpen?: Batch): Promise<Batch | undefined> {
    const isNew = !dataToOpen && true;
    if (isNew) {
      dataToOpen = new this.dataType();
      await this.onNewEntity(dataToOpen);
    }

    this.markAsLoading();

    const modal = await this.modalCtrl.create({
      component: BatchModal,
      componentProps: <Partial<IBatchModalOptions>>{
        programLabel: this.programLabel,
        acquisitionLevel: this.acquisitionLevel,
        disabled: this.disabled,
        data: dataToOpen,
        isNew,
        qvPmfm: this.qvPmfm,
        showTaxonGroup: this.showTaxonGroupColumn,
        showTaxonName: this.showTaxonNameColumn,
        // Not need on a root species batch (fill in sub-batches)
        showTotalIndividualCount: false,
        showIndividualCount: false,
        mobile: this.mobile,
        usageMode: this.usageMode,
        i18nSuffix: this.i18nColumnSuffix,
        maxVisibleButtons: 3,
        ...this.modalOptions
      },
      keyboardClose: true
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data} = await modal.onDidDismiss();
    if (data && this.debug) console.debug('[batches-table] Batch modal result: ', data);
    this.markAsLoaded();

    if (data instanceof Batch) {
      return data as Batch;
    }

    // Exit if empty
    return undefined;
  }
}

