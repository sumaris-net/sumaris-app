import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AlertController, ModalController, PopoverController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService, Alerts, ConfigService, FilesUtils, HammerSwipeEvent, isNotEmptyArray, isNotNil, LocalSettingsService, referentialToString, StatusIds } from '@sumaris-net/ngx-components';
import { Location } from '@angular/common';
import { VesselsTable } from './vessels.table';
import { VESSEL_CONFIG_OPTIONS, VESSEL_FEATURE_NAME } from '../services/config/vessel.config';
import { TableElement } from '@e-is/ngx-material-table';
import { SelectVesselsModal, SelectVesselsModalOptions } from '@app/vessel/modal/select-vessel.modal';
import { VesselFilter } from '@app/vessel/services/filter/vessel.filter';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { VesselService } from '@app/vessel/services/vessel-service';
import { FileTransferService } from '@app/shared/service/file-transfer.service';
import { Vessel } from '@app/vessel/services/model/vessel.model';

export const VesselsPageSettingsEnum = {
  PAGE_ID: "vessels",
  FEATURE_ID: VESSEL_FEATURE_NAME
};

@Component({
  selector: 'app-vessels-page',
  styleUrls: ['vessels.page.scss'],
  templateUrl: 'vessels.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VesselsPage implements OnInit, OnDestroy {

  readonly canEdit: boolean;
  readonly canDelete: boolean;
  readonly canReplace: boolean;
  readonly canImportFile: boolean;
  mobile: boolean;
  enableReplacement = false;
  enableFileImport = false;

  private _subscription = new Subscription();

  get replacementDisabled(): boolean {
    return !this.canReplace && this.table.selection.isEmpty() || this.table.selection.selected.some(row => row.currentData.statusId !== StatusIds.TEMPORARY);
  }

  @ViewChild('table', { static: true }) table: VesselsTable;

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected location: Location,
    protected modalCtrl: ModalController,
    protected alertCtrl: AlertController,
    protected accountService: AccountService,
    protected configService: ConfigService,
    protected translate: TranslateService,
    protected settings: LocalSettingsService,
    protected vesselService: VesselService,
    protected popoverController: PopoverController,
    private readonly transferService: FileTransferService,
    protected cd: ChangeDetectorRef
  ) {
    this.mobile = settings.mobile;
    const isAdmin = this.accountService.isAdmin();
    this.canEdit = isAdmin || this.accountService.isUser();
    this.canDelete = isAdmin;
    this.canReplace = isAdmin;
    this.canImportFile = isAdmin;
  }

  ngOnInit() {
    this.table.settingsId = VesselsPageSettingsEnum.PAGE_ID;

    this._subscription.add(
      this.configService.config.subscribe((config) => {
        this.enableReplacement = config.getPropertyAsBoolean(VESSEL_CONFIG_OPTIONS.TEMPORARY_VESSEL_REPLACEMENT_ENABLE);
        this.enableFileImport = config.getPropertyAsBoolean(VESSEL_CONFIG_OPTIONS.REFERENTIAL_VESSEL_IMPORT_ENABLE);
        this.markForCheck();
      })
    );
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
  }

  /**
   * Action triggered when user swipes
   */
  onSwipeTab(event: HammerSwipeEvent): boolean {
    // DEBUG
    // console.debug("[vessels] onSwipeTab()");

    // Skip, if not a valid swipe event
    if (!event
      || event.defaultPrevented || (event.srcEvent && event.srcEvent.defaultPrevented)
      || event.pointerType !== 'touch'
    ) {
      return false;
    }

    this.table.toggleSynchronizationStatus();

    return true;
  }

  async replace(event: MouseEvent) {
    if (this.table.selection.isEmpty()) return;

    const modal = await this.modalCtrl.create({
      component: SelectVesselsModal,
      componentProps: <SelectVesselsModalOptions>{
        titleI18n: 'VESSEL.SELECT_MODAL.REPLACE_TITLE',
        vesselFilter: <VesselFilter>{
          statusId: StatusIds.ENABLE,
          onlyWithRegistration: true
        },
        disableStatusFilter: true,
        showVesselTypeColumn: true,
        showBasePortLocationColumn: true,
      },
      keyboardClose: true,
      cssClass: 'modal-large'
    });

    // Open the modal
    await modal.present();

    // Wait until closed
    const {data} = await modal.onDidDismiss();

    if (data && data[0] instanceof VesselSnapshot) {
      console.debug('[vessels-page] Vessel selection modal result:', data);
      const vessel = data[0] as VesselSnapshot;

      if (await Alerts.askConfirmation(
        'VESSEL.ACTION.REPLACE_MANY_CONFIRMATION',
        this.alertCtrl,
        this.translate,
        event,
        {vessel: referentialToString(vessel, ['registrationCode', 'name'])})) {

        try {
          // Replace temp vessels (from selected rows)
          await this.vesselService.replaceTemporaryVessel(this.table.selection.selected.map(row => row.currentData.id), vessel.id);
        } catch (e) {
          await Alerts.showError(e.message, this.alertCtrl, this.translate);
        }

        // Clear selection and refresh
        this.table.selection.clear();
        this.table.onRefresh.emit();
        this.markForCheck();
      }

    } else {
      console.debug('[observed-location] Vessel selection modal was cancelled');
    }
  }

  /* -- protected methods -- */

  protected markForCheck() {
    this.cd.markForCheck();
  }

  async onOpenRow(row: TableElement<Vessel>) {
    return await this.router.navigateByUrl(`/vessels/${row.currentData.id}` );
  }

  async importFromCsv(event?: UIEvent, format = 'siop') {

    const {data} = await FilesUtils.showUploadPopover(this.popoverController, event, {
      uniqueFile: true,
      fileExtension: '.csv',
      uploadFn: (file) => this.transferService.uploadResource(file, {
        resourceType: Vessel.ENTITY_NAME,
        resourceId: Date.now().toString(),
        replace: true
      })
    });

    console.debug('[vessel] Vessel files uploaded! Response: ', data);

    const uploadedFileNames = (data || [])
      .map(file => file.response?.body)
      .filter(isNotNil)
      .map(({fileName}) => fileName);

    if (isNotEmptyArray(uploadedFileNames)) {
      const jobs = await Promise.all(
        uploadedFileNames.map(uploadedFileName => this.vesselService.importFile(uploadedFileName, format))
      );

      console.info('[vessel] Vessel imported with success!: ', jobs);
    }

  }
}

