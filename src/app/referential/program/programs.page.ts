import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { AccountService, LocalSettingsService } from '@sumaris-net/ngx-components';
import { ModalController, Platform } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ReferentialTable } from '../table/referential.table';
import { AppRootTableSettingsEnum } from '@app/data/table/root-table.class';

export const ProgramsPageSettingsEnum = {
  PAGE_ID: "programs",
  FILTER_KEY: AppRootTableSettingsEnum.FILTER_KEY
};

@Component({
  selector: 'app-program-page',
  templateUrl: './programs.page.html',
  styleUrls: ['./programs.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgramsPage implements OnInit {

  canEdit: boolean;
  canDelete: boolean;

  @ViewChild('table', { static: true }) table: ReferentialTable;

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected platform: Platform,
    protected location: Location,
    protected modalCtrl: ModalController,
    protected accountService: AccountService,
    protected settings: LocalSettingsService,
    protected cd: ChangeDetectorRef
  ) {
    const isAdmin = this.accountService.isAdmin();
    this.canEdit = isAdmin || this.accountService.isSupervisor();
    this.canDelete = isAdmin;
  }

  ngOnInit() {
    this.table.settingsId =  ProgramsPageSettingsEnum.PAGE_ID;
    this.table.entityName = 'Program';
    this.table.restoreFilterOrLoad();
  }

  /* -- protected methods -- */


}

