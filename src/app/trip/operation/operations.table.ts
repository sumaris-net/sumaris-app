import { Component, OnInit, Input, Output, OnDestroy, EventEmitter } from "@angular/core";
import {Observable, of} from 'rxjs';
import {first, map, mergeMap} from "rxjs/operators";
import { ValidatorService, TableElement } from "angular4-material-table";
import { AppTableDataSource, AppTable, AccountService, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS } from "../../core/core.module";
import { OperationValidatorService } from "../services/operation.validator";
import { Operation, Trip, referentialToString, EntityUtils, ReferentialRef } from "../services/trip.model";
import { ModalController, Platform, AlertController } from "@ionic/angular";
import { Router, ActivatedRoute } from "@angular/router";
import { Location } from '@angular/common';
import { ReferentialRefService } from "../../referential/referential.module";
import { OperationService, OperationFilter } from "../services/operation.service";
import { PositionValidatorService } from "../services/position.validator";
import { TranslateService } from "@ngx-translate/core";


@Component({
  selector: 'table-operations',
  templateUrl: 'operations.table.html',
  styleUrls: ['operations.table.scss'],
  providers: [
    { provide: ValidatorService, useClass: OperationValidatorService },
    { provide: ValidatorService, useClass: PositionValidatorService }
  ],
})
export class OperationTable extends AppTable<Operation, OperationFilter> implements OnInit, OnDestroy {

  private _onMetierCellChange = new EventEmitter<any>();

  metiers: Observable<ReferentialRef[]>;

  @Input() latLongPattern: string;

  @Input() tripId: number;

  @Output()
  onOperationClick: EventEmitter<number> = new EventEmitter<number>();

  @Output()
  onNewOperationClick: EventEmitter<void> = new EventEmitter<void>();

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected platform: Platform,
    protected location: Location,
    protected modalCtrl: ModalController,
    protected accountService: AccountService,
    protected validatorService: OperationValidatorService,
    protected dataService: OperationService,
    protected referentialRefService: ReferentialRefService,
    protected alertCtrl: AlertController,
    protected translate: TranslateService
  ) {
    super(route, router, platform, location, modalCtrl, accountService,
      RESERVED_START_COLUMNS
        .concat(
          ['metier',
            'startDateTime',
            'startPosition',
            'endDateTime',
            'endPosition',
            'comments'])
        .concat(RESERVED_END_COLUMNS),
      new AppTableDataSource<Operation, OperationFilter>(Operation, dataService, validatorService,
        // DataSource options
        {
          prependNewElements: false,
          serviceOptions: {
            saveOnlyDirtyRows: true
          }
        })
    );
    this.i18nColumnPrefix = 'TRIP.OPERATION.LIST.';
    this.autoLoad = false;
    this.latLongPattern = accountService.account.settings.latLongFormat || 'DDMM';
    //this.inlineEdition = true; // TODO: remove this line !
    this.pageSize = 1000; // Do not use paginator
  };


  ngOnInit() {

    super.ngOnInit();

    this.tripId && this.setTripId(this.tripId);

    // Combo: métiers
    this.metiers = this._onMetierCellChange
      .pipe(
        mergeMap(value => {
          if (EntityUtils.isNotEmpty(value)) return of([value]);
          value = (typeof value === "string" && value !== '*') && value || undefined;
          return this.referentialRefService.loadAll(0, !value ? 30 : 10, undefined, undefined,
            {
              entityName: 'Metier',
              searchText: value as string
            })
            .pipe(
              first(),
              map(({data}) => data)
            );
        }));

  }

  setTrip(data: Trip) {
    this.setTripId(data.id);
  }

  setTripId(tripId: number) {
    this.tripId = tripId;
    this.filter = this.filter || {};
    this.filter.tripId = tripId;
    this.dataSource.serviceOptions = this.dataSource.serviceOptions || {};
    this.dataSource.serviceOptions.tripId = tripId;
    if (tripId) {
      this.onRefresh.emit();
    }
  }

  async deleteSelection(confirm?: boolean): Promise<void> {
    if (this.loading) return;

    if (!confirm) {
      const translations = this.translate.instant(['COMMON.YES', 'COMMON.NO', 'CONFIRM.DELETE', 'CONFIRM.ALERT_HEADER']);
      const alert = await this.alertCtrl.create({
        header: translations['CONFIRM.ALERT_HEADER'],
        message: translations['CONFIRM.DELETE'],
        buttons: [
          {
            text: translations['COMMON.NO'],
            role: 'cancel',
            cssClass: 'secondary',
            handler: () => { }
          },
          {
            text: translations['COMMON.YES'],
            handler: () => {
              confirm = true; // update upper value
            }
          }
        ]
      });
      await alert.present();
      await alert.onDidDismiss();
    }

    if (confirm) {
      await super.deleteSelection();
    }
  }

  protected async openEditRowDetail(id: number): Promise<boolean> {
    if (this.onOperationClick.observers.length) {
      this.onOperationClick.emit(id);
      return true;
    }

    return await this.router.navigateByUrl('/operations/' + this.tripId + '/' + id);
  }

  protected async openNewRowDetail(): Promise<boolean> {
    if (this.onNewOperationClick.observers.length) {
      this.onNewOperationClick.emit();
      return true;
    }
    return await this.router.navigateByUrl('/operations/' + this.tripId + '/new');
  }

  referentialToString = referentialToString;

}

