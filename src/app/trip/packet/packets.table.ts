import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Injector, Input, OnInit } from '@angular/core';
import { TableElement } from '@e-is/ngx-material-table';
import { AppTable, EntitiesTableDataSource, InMemoryEntitiesService, isNil, isNotEmptyArray, LocalSettingsService, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS } from '@sumaris-net/ngx-components';
import { IWithPacketsEntity, Packet, PacketFilter, PacketUtils } from '../services/model/packet.model';
import { PacketValidatorService } from '../services/validator/packet.validator';
import { ModalController, Platform } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { DenormalizedPmfmStrategy } from '@app/referential/services/model/pmfm-strategy.model';
import { PacketModal, PacketModalOptions } from './packet.modal';
import { PacketSaleModal } from '../sale/packet-sale.modal';
import { SaleProductUtils } from '../services/model/sale-product.model';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { environment } from '@environments/environment';
import { ProgramRefService } from '@app/referential/services/program-ref.service';

@Component({
  selector: 'app-packets-table',
  templateUrl: 'packets.table.html',
  styleUrls: ['packets.table.scss'],
  providers: [
    {
      provide: InMemoryEntitiesService,
      useFactory: () => new InMemoryEntitiesService(Packet, PacketFilter, {
        equals: Packet.equals
      })
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PacketsTable extends AppTable<Packet, PacketFilter> implements OnInit {

  @Input() $parents: BehaviorSubject<IWithPacketsEntity<any, any>[]>;
  @Input() parentAttributes: string[];

  @Input() showToolbar = true;
  @Input() useSticky = false;

  @Input() set parentFilter(packetFilter: PacketFilter) {
    this.setFilter(packetFilter);
  }

  private _program: string;

  @Input()
  set program(value: string) {
    this._program = value;
    if (value) {
      this.loadPmfms();
    }
  }

  get program(): string {
    return this._program;
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

  private packetSalePmfms: DenormalizedPmfmStrategy[];

  constructor(
    injector: Injector,
    protected validatorService: PacketValidatorService,
    protected memoryDataService: InMemoryEntitiesService<Packet, PacketFilter>,
    protected programRefService: ProgramRefService,
    protected cd: ChangeDetectorRef,
  ) {
    super(injector,
      // columns
      RESERVED_START_COLUMNS
        .concat([
          'parent',
          'number',
          'weight'
        ])
        .concat(RESERVED_END_COLUMNS),
      new EntitiesTableDataSource<Packet, PacketFilter>(Packet, memoryDataService, validatorService, {
        prependNewElements: false,
        suppressErrors: environment.production,
        onRowCreated: (row) => this.onRowCreated(row)
      }),
      null // Filter
    );

    this.i18nColumnPrefix = 'PACKET.LIST.';
    this.autoLoad = false; // waiting parent to be loaded
    this.inlineEdition = this.validatorService && !this.mobile;
    this.confirmBeforeDelete = true;
    this.defaultPageSize = -1; // Do not use paginator

    // FOR DEV ONLY ----
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    this.registerAutocompleteField('parent', {
      items: this.$parents,
      attributes: this.parentAttributes,
      columnNames: ['RANK_ORDER', 'REFERENTIAL.LABEL', 'REFERENTIAL.NAME'],
      columnSizes: this.parentAttributes.map(attr => attr === 'metier.label' ? 3 : (attr === 'rankOrderOnPeriod' ? 1 : undefined)),
      mobile: this.mobile
    });

    this.registerSubscription(this.onStartEditingRow.subscribe(row => this.onStartEditPacket(row)));
  }

  private loadPmfms() {
    this.programRefService.loadProgramPmfms(this.program, {acquisitionLevel: AcquisitionLevelCodes.PACKET_SALE})
      .then(packetSalePmfms => this.packetSalePmfms = packetSalePmfms);
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

  protected async addEntityToTable(data: Packet, opts?: { confirmCreate?: boolean; }): Promise<TableElement<Packet>> {
    if (!data) throw new Error("Missing data to add");
    if (this.debug) console.debug("[measurement-table] Adding new entity", data);

    const row = await this.addRowToTable();
    if (!row) throw new Error("Could not add row to table");

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
    }
    else {
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
    const rows = await this.dataSource.getRows();
    return rows.reduce((res, row) => Math.max(res, row.currentData.rankOrder || 0), 0);
  }

  protected markForCheck() {
    this.cd.markForCheck();
  }

  protected async openRow(id: number, row: TableElement<Packet>): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    await this.openComposition(null, row);
    return true;
  }

  protected async openNewRowDetail(): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    const { data, role } = await this.openDetailModal();

    if (data) {
      const row = await this.addEntityToTable(data);

      if (role === 'sale') {
        await this.openPacketSale(null, row);
      }
    } else {
      this.editedRow = null;
    }
    return true;
  }

  async openDetailModal(packet?: Packet): Promise<{ data: Packet, role: string }> {
    const isNew = !packet && true;
    if (isNew) {
      packet = new Packet();

      if (this.filter?.parent) {
        packet.parent = this.filter.parent;
      } else if (this.$parents.value?.length === 1) {
        packet.parent =  this.$parents.value[0];
      }
    }

    const modal = await this.modalCtrl.create({
      component: PacketModal,
      componentProps: <PacketModalOptions>{
        mobile: this.mobile,
        parents: this.$parents.value,
        parentAttributes: this.parentAttributes,
        data: packet,
        isNew,
        onDelete: (event, packet) => this.deletePacket(event, packet)
      },
      backdropDismiss: false,
      cssClass: 'modal-large'
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const res = await modal.onDidDismiss();
    this.markAsLoaded();

    if (res?.data) {
      if (this.debug) console.debug('[packet-table] packet modal result: ', res);

      return {data: res.data as Packet, role: res.role};
    }
  }

  async deletePacket(event: UIEvent, data): Promise<boolean> {
    const row = await this.findRowByPacket(data);

    // Row not exists: OK
    if (!row) return true;

    const canDeleteRow = await this.canDeleteRows([row]);
    if (canDeleteRow === true) {
      this.cancelOrDelete(event, row, {interactive: false /*already confirmed*/});
    }
    return canDeleteRow;
  }


  async openComposition(event: MouseEvent, row: TableElement<Packet>) {
    if (event) event.stopPropagation();

    const res = await this.openDetailModal(row.currentData);

    if (res && res.data) {
      row.validator.patchValue(res.data, {onlySelf: false, emitEvent: true});

      // update sales
      this.updateSaleProducts(row);

      this.markAsDirty({emitEvent: false});
      this.markForCheck();

      if (res.role === 'sale') {
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
        const updatedSaleProducts = SaleProductUtils.updateAggregatedSaleProducts(row.currentData, this.packetSalePmfms);
        row.validator.patchValue({saleProducts: updatedSaleProducts}, {emitEvent: true});
      }
    }
  }

  async openPacketSale(event: MouseEvent, row: TableElement<Packet>) {
    if (event) event.stopPropagation();

    const modal = await this.modalCtrl.create({
      component: PacketSaleModal,
      componentProps: {
        packet: row.currentData,
        packetSalePmfms: this.packetSalePmfms
      },
      backdropDismiss: false,
      cssClass: 'modal-large'
    });

    await modal.present();
    const res = await modal.onDidDismiss();

    if (res && res.data) {
      // patch saleProducts only
      row.validator.patchValue({saleProducts: res.data.saleProducts}, {emitEvent: true});
      this.markAsDirty({emitEvent: false});
      this.markForCheck();
    }
  }

  /* -- protected methods -- */

  protected async findRowByPacket(packet: Packet): Promise<TableElement<Packet>> {
    return Packet && (await this.dataSource.getRows()).find(r => Packet.equals(packet, r.currentData));
  }

  private onStartEditPacket(row: TableElement<Packet>) {
    if (this.filter && this.filter.parent && row.currentData && !row.currentData.parent) {
      row.validator.patchValue({parent: this.filter.parent});
    }
  }
}
