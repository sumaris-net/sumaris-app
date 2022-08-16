import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService, HammerSwipeEvent, LocalSettingsService } from '@sumaris-net/ngx-components';
import { Location } from '@angular/common';
import { VesselsTable } from './vessels.table';
import { VESSEL_FEATURE_NAME } from '../services/config/vessel.config';
import { TableElement } from '@e-is/ngx-material-table';

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
export class VesselsPage implements OnInit {

  canEdit: boolean;
  canDelete: boolean;
  mobile: boolean;

  @ViewChild('table', { static: true }) table: VesselsTable;

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected location: Location,
    protected modalCtrl: ModalController,
    protected accountService: AccountService,
    protected settings: LocalSettingsService,
    protected cd: ChangeDetectorRef
  ) {
    this.mobile = settings.mobile;
    const isAdmin = this.accountService.isAdmin();
    this.canEdit = isAdmin || this.accountService.isUser();
    this.canDelete = isAdmin;
  }

  ngOnInit() {
    this.table.settingsId = VesselsPageSettingsEnum.PAGE_ID;

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

  /* -- protected methods -- */

  protected markForCheck() {
    this.cd.markForCheck();
  }

  async onOpenRow(event: {id?: number, row: TableElement<any>}) {
    return await this.router.navigateByUrl(`/vessels/${event.row && event.row.currentData.id || event.id}` );
  }
}

