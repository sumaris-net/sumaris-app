import { ChangeDetectionStrategy, Component, Injector, Input, OnDestroy, OnInit } from '@angular/core';
import { AcquisitionLevelCodes } from '@app/referential/services/model/model.enum';
import { BaseMeasurementsTable } from '@app/data/measurement/measurements-table.class';
import { OperationGroupValidatorService } from './operation-group.validator';
import { Observable } from 'rxjs';
import { TableElement } from '@e-is/ngx-material-table';
import { InMemoryEntitiesService, isNil, LocalSettingsService, ReferentialRef, referentialToString } from '@sumaris-net/ngx-components';
import { MetierService } from '@app/referential/services/metier.service';
import { OperationGroup } from '../trip/trip.model';
import { environment } from '@environments/environment';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { IOperationGroupModalOptions, OperationGroupModal } from '@app/trip/operationgroup/operation-group.modal';
import { OperationGroupFilter } from '@app/trip/operationgroup/operation-group.filter';
import { RxState } from '@rx-angular/state';

export const OPERATION_GROUP_RESERVED_START_COLUMNS: string[] = ['metier'];
export const OPERATION_GROUP_RESERVED_START_COLUMNS_NOT_MOBILE: string[] = ['gear', 'targetSpecies'];
export const OPERATION_GROUP_RESERVED_END_COLUMNS: string[] = ['comments'];

@Component({
  selector: 'app-operation-group-table',
  templateUrl: 'operation-groups.table.html',
  styleUrls: ['operation-groups.table.scss'],
  providers: [
    {
      provide: InMemoryEntitiesService,
      useFactory: () =>
        new InMemoryEntitiesService<OperationGroup, OperationGroupFilter>(OperationGroup, OperationGroupFilter, {
          equals: OperationGroup.equals,
          sortByReplacement: { id: 'rankOrder' },
        }),
    },
    RxState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationGroupTable
  extends BaseMeasurementsTable<
    OperationGroup,
    OperationGroupFilter,
    InMemoryEntitiesService<OperationGroup, OperationGroupFilter>,
    OperationGroupValidatorService
  >
  implements OnInit, OnDestroy
{
  @Input() metiers: Observable<ReferentialRef[]> | ReferentialRef[];

  referentialToString = referentialToString;
  displayAttributes: {
    [key: string]: string[];
  };

  @Input()
  set value(data: OperationGroup[]) {
    this.memoryDataService.value = data;
  }

  get value(): OperationGroup[] {
    return this.memoryDataService.value;
  }

  constructor(
    injector: Injector,
    settings: LocalSettingsService,
    dataService: InMemoryEntitiesService<OperationGroup, OperationGroupFilter>,
    validatorService: OperationGroupValidatorService,
    protected metierService: MetierService
  ) {
    super(injector, OperationGroup, OperationGroupFilter, dataService, validatorService, {
      reservedStartColumns: settings.mobile
        ? OPERATION_GROUP_RESERVED_START_COLUMNS
        : OPERATION_GROUP_RESERVED_START_COLUMNS.concat(OPERATION_GROUP_RESERVED_START_COLUMNS_NOT_MOBILE),
      reservedEndColumns: settings.mobile ? [] : OPERATION_GROUP_RESERVED_END_COLUMNS,
      mapPmfms: (pmfms) => this.mapPmfms(pmfms),
      i18nColumnPrefix: 'TRIP.OPERATION.LIST.',
    });
    this.autoLoad = false; // waiting parent to be loaded
    this.inlineEdition = this.validatorService && !this.mobile;
    this.confirmBeforeDelete = true;
    this.defaultPageSize = -1; // Do not use paginator

    // Set default acquisition level
    this.acquisitionLevel = AcquisitionLevelCodes.OPERATION;

    // FOR DEV ONLY ----
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    this.displayAttributes = {
      gear: this.settings.getFieldDisplayAttributes('gear'),
      taxonGroup: ['taxonGroup.label', 'taxonGroup.name'],
      metier: this.settings.getFieldDisplayAttributes('metier'),
    };

    // Metier combo
    this.registerAutocompleteField('metier', {
      showAllOnFocus: true,
      items: this.metiers,
      attributes: this.displayAttributes.metier,
      columnSizes: this.displayAttributes.metier.map((attr) => (attr === 'label' ? 3 : undefined)),
      mobile: this.mobile,
    });

    // Add sort replacement
    this.memoryDataService.addSortByReplacement('gear', this.displayAttributes.gear[0]);
    this.memoryDataService.addSortByReplacement('taxonGroup', this.displayAttributes.taxonGroup[0]);
    this.memoryDataService.addSortByReplacement('targetSpecies', this.displayAttributes.metier[0]);
  }

  ngOnDestroy() {
    super.ngOnDestroy();
    this.memoryDataService.stop();
  }

  async openDetailModal(dataToOpen?: OperationGroup): Promise<OperationGroup | undefined> {
    const isNew = !dataToOpen && true;
    if (isNew) {
      dataToOpen = new this.dataType();
      await this.onNewEntity(dataToOpen);
    }

    this.markAsLoading();

    const modal = await this.modalCtrl.create({
      component: OperationGroupModal,
      componentProps: <IOperationGroupModalOptions>{
        programLabel: this.programLabel,
        acquisitionLevel: this.acquisitionLevel,
        metiers: this.metiers,
        disabled: this.disabled,
        mobile: this.mobile,
        data: dataToOpen,
        isNew,
        onDelete: (event, item) => this.deleteEntity(event, item),
      },
      keyboardClose: true,
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const { data } = await modal.onDidDismiss();
    if (data && this.debug) console.debug('[operation-groups-table] operation-groups modal result: ', data);
    this.markAsLoaded();

    if (data instanceof OperationGroup) {
      return data as OperationGroup;
    }

    // Exit if empty
    return undefined;
  }

  protected async getMaxRankOrderOnPeriod(): Promise<number> {
    const rows = this.dataSource.getRows();
    return rows.reduce((res, row) => Math.max(res, row.currentData.rankOrderOnPeriod || 0), 0);
  }

  async onMetierChange($event: FocusEvent, row: TableElement<OperationGroup>) {
    if (row && row.currentData && row.currentData.metier) {
      console.debug('[operation-group.table] onMetierChange', $event, row.currentData.metier);
      const operationGroup: OperationGroup = row.currentData;

      if (operationGroup.metier?.id && (!operationGroup.metier?.gear || !operationGroup.metier?.taxonGroup)) {
        // First, load the Metier (with children)
        const metier = await this.metierService.load(operationGroup.metier.id);

        // affect to current row
        row.validator.controls['metier'].setValue(metier);
      }
    }
  }

  /* -- protected methods -- */

  private mapPmfms(pmfms: IPmfm[]): IPmfm[] {
    // if (this.mobile) {
    //   pmfms.forEach(pmfm => pmfm.hidden = true);
    //   // return [];
    // }

    return pmfms;
  }

  protected async openNewRowDetail(): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    const data = await this.openDetailModal();
    if (data) {
      await this.addEntityToTable(data);
    }
    return true;
  }

  protected async openRow(id: number, row: TableElement<OperationGroup>): Promise<boolean> {
    if (!this.allowRowDetail) return false;

    const data = this.toEntity(row, true);

    const updatedData = await this.openDetailModal(data);
    if (updatedData) {
      await this.updateEntityToTable(updatedData, row, { confirmEdit: false });
    } else {
      this.editedRow = null;
    }
    return true;
  }

  protected async onNewEntity(data: OperationGroup): Promise<void> {
    if (isNil(data.rankOrderOnPeriod)) {
      data.rankOrderOnPeriod = (await this.getMaxRankOrderOnPeriod()) + 1;
    }
  }

  protected async findRowByOperationGroup(operationGroup: OperationGroup): Promise<TableElement<OperationGroup>> {
    return OperationGroup && this.dataSource.getRows().find((r) => operationGroup.equals(r.currentData));
  }
}
