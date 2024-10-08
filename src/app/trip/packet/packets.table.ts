import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { TableElement } from '@e-is/ngx-material-table';
import {
  createPromiseEventEmitter,
  emitPromiseEvent,
  InMemoryEntitiesService,
  isNil,
  isNotEmptyArray,
  PromiseEvent,
} from '@sumaris-net/ngx-components';
import { IWithPacketsEntity, Packet, PacketFilter, PacketUtils } from './packet.model';
import { PacketValidatorService } from './packet.validator';
import { Observable } from 'rxjs';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { IPacketModalOptions, PacketModal } from './packet.modal';
import { IPacketSaleModalOptions, PacketSaleModal } from '../sale/packet-sale.modal';
import { SaleProductUtils } from '../sale/sale-product.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { BaseMeasurementsTableState } from '@app/data/measurement/measurements-table.class';
import { RxStateProperty, RxStateSelect } from '@app/shared/state/state.decorator';
import { RxState } from '@rx-angular/state';
import { AppBaseTable } from '@app/shared/table/base.table';

export interface PacketsTableState extends BaseMeasurementsTableState {
  parents: IWithPacketsEntity<any>[];
}

@Component({
  selector: 'app-packets-table',
  templateUrl: 'packets.table.html',
  styleUrls: ['packets.table.scss'],
  providers: [
    {
      provide: InMemoryEntitiesService,
      useFactory: () =>
        new InMemoryEntitiesService(Packet, PacketFilter, {
          equals: Packet.equals,
        }),
    },
    RxState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PacketsTable
  extends AppBaseTable<Packet, PacketFilter, InMemoryEntitiesService<Packet, PacketFilter>, PacketValidatorService, number, PacketsTableState>
  implements OnInit, OnDestroy
{
  private _pmfms: DenormalizedPmfmStrategy[];
  private _programLabel: string;

  @RxStateSelect() protected parents$: Observable<IWithPacketsEntity<any>[]>;

  @Input() @RxStateProperty() parents: IWithPacketsEntity<any>[];
  @Input() parentAttributes: string[];

  @Input() set parentFilter(packetFilter: PacketFilter) {
    this.setFilter(packetFilter);
  }

  @Input()
  set programLabel(value: string) {
    this._programLabel = value;
    if (value) {
      this.loadPmfms();
    }
  }

  get programLabel(): string {
    return this._programLabel;
  }

  @Input()
  set value(data: Packet[]) {
    this.memoryDataService.value = data;
  }

  get value(): Packet[] {
    return this.memoryDataService.value;
  }

  get dirty(): boolean {
    return super.dirty || this.memoryDataService.dirty;
  }

  @Output('askSaveConfirmation') askSaveConfirmation: EventEmitter<PromiseEvent<boolean>> = createPromiseEventEmitter<boolean>();

  constructor(
    memoryDataService: InMemoryEntitiesService<Packet, PacketFilter>,
    validatorService: PacketValidatorService,
    protected programRefService: ProgramRefService
  ) {
    super(
      Packet,
      PacketFilter,
      // columns
      ['parent', 'number', 'weight'],
      memoryDataService,
      validatorService,
      {
        suppressErrors: true,
        onRowCreated: (row) => this.onRowCreated(row),
      }
    );

    this.i18nColumnPrefix = 'PACKET.LIST.';
    this.autoLoad = false; // waiting parent to be loaded
    this.inlineEdition = this.validatorService && !this.mobile;
    this.confirmBeforeDelete = true;
    this.defaultPageSize = -1; // Do not use paginator
    this.canEdit = true;

    // FOR DEV ONLY ----
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    this.registerAutocompleteField('parent', {
      items: this.parents$,
      attributes: this.parentAttributes,
      columnNames: ['RANK_ORDER', 'REFERENTIAL.LABEL', 'REFERENTIAL.NAME'],
      columnSizes: this.parentAttributes.map((attr) => (attr === 'metier.label' ? 3 : attr === 'rankOrderOnPeriod' ? 1 : undefined)),
      mobile: this.mobile,
    });

    this.registerSubscription(this.onStartEditingRow.subscribe((row) => this.onStartEditPacket(row)));
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.memoryDataService.stop();
  }

  private loadPmfms() {
    this.programRefService
      .loadProgramPmfms(this.programLabel, { acquisitionLevel: AcquisitionLevelCodes.PACKET_SALE })
      .then((packetSalePmfms) => (this._pmfms = packetSalePmfms));
  }

  trackByFn(index: number, row: TableElement<Packet>): number {
    return row.currentData.rankOrder;
  }

  private async onRowCreated(row: TableElement<Packet>) {
    const data = row.currentData; // if validator enable, this will call a getter function

    await this.onNewEntity(data);

    // Affect new row
    if (row.validator) {
      row.validator.patchValue(data);
      row.validator.markAsDirty();
    } else {
      row.currentData = data;
    }

    this.markForCheck();
  }

  protected async addEntityToTable(data: Packet, opts?: { confirmCreate?: boolean }): Promise<TableElement<Packet>> {
    if (!data) throw new Error('Missing data to add');
    if (this.debug) console.debug('[measurement-table] Adding new entity', data);

    const row = await this.addRowToTable();
    if (!row) throw new Error('Could not add row to table');

    await this.onNewEntity(data);

    // Affect new row
    if (row.validator) {
      row.validator.patchValue(data);
      row.validator.markAsDirty();
    } else {
      row.currentData = data;
    }

    // Confirm the created row
    if (!opts || opts.confirmCreate !== false) {
      this.confirmEditCreate(null, row);
      this.editedRow = null;
    } else {
      this.editedRow = row;
    }

    this.markAsDirty();

    return row;
  }

  protected async onNewEntity(data: Packet): Promise<void> {
    if (isNil(data.rankOrder)) {
      data.rankOrder = (await this.getMaxRankOrder()) + 1;
    }
  }

  protected async getMaxRankOrder(): Promise<number> {
    const rows = this.dataSource.getRows();
    return rows.reduce((res, row) => Math.max(res, row.currentData.rankOrder || 0), 0);
  }

  protected async openRow(id: number, row: TableElement<Packet>): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    await this.openComposition(null, row);
    return true;
  }

  protected async openNewRowDetail(): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    const { data, role } = await this.openDetailModal();

    if (data && role !== 'delete') {
      const row = await this.addEntityToTable(data);

      // Redirect to another modal
      if (role === 'sale') {
        await this.openPacketSale(null, row);
      }
    } else {
      this.editedRow = null;
    }
    return true;
  }

  async openDetailModal(dataToOpen?: Packet): Promise<{ data: Packet; role: string }> {
    const isNew = !dataToOpen && true;
    if (isNew) {
      dataToOpen = new Packet();

      if (this.filter?.parent) {
        dataToOpen.parent = this.filter.parent;
      } else if (this.parents?.length === 1) {
        dataToOpen.parent = this.parents[0];
      }
    }

    const modal = await this.modalCtrl.create({
      component: PacketModal,
      componentProps: <IPacketModalOptions>{
        disabled: this.disabled,
        mobile: this.mobile,
        parents: this.parents || null,
        parentAttributes: this.parentAttributes,
        data: dataToOpen,
        isNew,
        onDelete: (event, packet) => this.deleteEntity(event, packet),
      },
      backdropDismiss: false,
      cssClass: 'modal-large',
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const { data, role } = await modal.onDidDismiss();
    this.markAsLoaded();

    if (this.debug) console.debug('[packet-table] packet modal result: ', { data, role });
    return { data: data instanceof Packet ? (data as Packet) : undefined, role };
  }

  async deleteEntity(event: Event, data): Promise<boolean> {
    const row = await this.findRowByPacket(data);

    // Row not exists: OK
    if (!row) return true;

    const canDeleteRow = await this.canDeleteRows([row]);
    if (canDeleteRow === true) {
      this.cancelOrDelete(undefined, row, { interactive: false /*already confirmed*/ });
    }
    return canDeleteRow;
  }

  async openComposition(event: MouseEvent, row: TableElement<Packet>) {
    if (event) event.stopPropagation();

    const { data, role } = await this.openDetailModal(row.currentData);

    if (data && role !== 'delete') {
      row.validator.patchValue(data, { onlySelf: false, emitEvent: true });

      // update sales
      this.updateSaleProducts(row);

      this.markAsDirty({ emitEvent: false });
      this.markForCheck();

      if (role === 'sale') {
        await this.openPacketSale(null, row);
      }
    }
  }

  getComposition(row: TableElement<Packet>): string {
    return PacketUtils.getComposition(row.currentData);
  }

  updateSaleProducts(row: TableElement<Packet>) {
    if (row && row.currentData) {
      // update sales if any
      if (isNotEmptyArray(row.currentData.saleProducts)) {
        const updatedSaleProducts = SaleProductUtils.updateAggregatedSaleProducts(row.currentData, this._pmfms);
        row.validator.patchValue({ saleProducts: updatedSaleProducts }, { emitEvent: true });
      }
    }
  }

  async openPacketSale(event: UIEvent, row: TableElement<Packet>) {
    if (event) event.stopPropagation();

    // Make sure to save before open sale modal, because sale's product use packet id
    if (isNil(row.currentData?.id)) {
      console.info(this.logPrefix + 'Cannot open packet sale modal: missing packet id. Trying to save editor...');
      const packet = Packet.fromObject(row.currentData);

      // Ask user confirmation
      const saved = await emitPromiseEvent(this.askSaveConfirmation, 'openPacketSale');

      // User cancelled, or save failed
      if (!saved) return;

      console.info(this.logPrefix + 'Save succeed. Waiting table to be reload');

      // Wait table reload
      await this.waitIdle({ timeout: 2000 });

      // Retrieve the expected packet
      row = await this.findRowByPacket(packet);
      if (!row) {
        console.error(this.logPrefix + 'Cannot open sale packet: expected packet cannot be found after saving');
        return; // Stop
      }
    }

    const modal = await this.modalCtrl.create({
      component: PacketSaleModal,
      componentProps: <IPacketSaleModalOptions>{
        data: row.currentData,
        pmfms: this._pmfms,
        disabled: this.disabled,
        mobile: this.mobile,
      },
      backdropDismiss: false,
      cssClass: 'modal-large',
    });

    await modal.present();
    const res = await modal.onDidDismiss();

    if (res && res.data) {
      // patch saleProducts only
      row.validator.patchValue({ saleProducts: res.data.saleProducts }, { emitEvent: true });
      this.markAsDirty({ emitEvent: false });
      this.markForCheck();
    }
  }

  /* -- protected methods -- */

  protected async findRowByPacket(packet: Packet): Promise<TableElement<Packet>> {
    return packet && this.dataSource.getRows().find((r) => Packet.equals(packet, r.currentData));
  }

  private onStartEditPacket(row: TableElement<Packet>) {
    if (this.filter && this.filter.parent && row.currentData && !row.currentData.parent) {
      row.validator.patchValue({ parent: this.filter.parent });
    }
  }
}
