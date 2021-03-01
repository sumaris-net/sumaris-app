import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Injector, OnInit} from "@angular/core";
import {Person, UserProfileLabels} from "../../../core/services/model/person.model";
import {DefaultStatusList, referentialToString, StatusValue} from "../../../core/services/model/referential.model";
import {PersonFilter, PersonService} from "../../services/person.service";
import {PersonValidatorService} from "../../services/validator/person.validator";
import {ModalController} from "@ionic/angular";
import {ActivatedRoute, Router} from "@angular/router";
import {AccountService} from "../../../core/services/account.service";
import {Location} from '@angular/common';
import {FormBuilder, FormGroup} from "@angular/forms";
import {AppTable, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS} from "../../../core/table/table.class";
import {ValidatorService} from "@e-is/ngx-material-table";
import {FormFieldDefinition} from "../../../shared/form/field.model";
import {PlatformService} from "../../../core/services/platform.service";
import {LocalSettingsService} from "../../../core/services/local-settings.service";
import {debounceTime, filter} from "rxjs/operators";
import {EntitiesTableDataSource} from "../../../core/table/entities-table-datasource.class";
import {isNotNil} from "../../../shared/functions";
import {ENVIRONMENT, Environment} from "../../../../environments/environment.class";

@Component({
  selector: 'app-users-table',
  templateUrl: 'users.html',
  styleUrls: ['./users.scss'],
  providers: [
    {provide: ValidatorService, useExisting: PersonValidatorService}
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersPage extends AppTable<Person, PersonFilter> implements OnInit {

  canEdit = false;
  filterForm: FormGroup;
  profiles = UserProfileLabels;
  additionalFields: FormFieldDefinition[];
  statusList = DefaultStatusList;
  statusById: {[key: number]: StatusValue};
  filterIsEmpty = true;

  constructor(
    protected route: ActivatedRoute,
    protected router: Router,
    protected platform: PlatformService,
    protected location: Location,
    protected modalCtrl: ModalController,
    protected accountService: AccountService,
    protected settings: LocalSettingsService,
    protected validatorService: ValidatorService,
    protected dataService: PersonService,
    protected cd: ChangeDetectorRef,
    formBuilder: FormBuilder,
    injector: Injector,
    @Inject(ENVIRONMENT) environment: Environment
  ) {
    super(route, router, platform, location, modalCtrl, settings,
      RESERVED_START_COLUMNS
        .concat([
          'avatar',
          'lastName',
          'firstName',
          'email',
          'profile',
          'status',
          'pubkey'
        ])
        .concat(accountService.additionalFields.map(field => field.key))
        .concat(RESERVED_END_COLUMNS),
      new EntitiesTableDataSource<Person, PersonFilter>(Person, dataService, validatorService, {
        prependNewElements: false,
        suppressErrors: environment.production,
        dataServiceOptions: {
          saveOnlyDirtyRows: true
        }
      }),
      undefined,
      injector
    );

    // Allow inline edition only if admin
    this.inlineEdition = accountService.isAdmin(); // TODO: only if desktop ?
    this.canEdit = accountService.isAdmin();
    this.confirmBeforeDelete = true;

    this.i18nColumnPrefix = 'USER.';
    this.filterForm = formBuilder.group({
      'searchText': [null]
    });

    // Fill statusById
    this.statusById = {};
    this.statusList.forEach((status) => this.statusById[status.id] = status);

    this.additionalFields = (this.accountService.additionalFields || [])
      .filter(field => isNotNil(field.autocomplete))
      .map(field => {
        // Make sure to get the final autocomplete config (e.g. with a suggestFn function)
        field.autocomplete = this.registerAutocompleteField(field.key, {
          ...field.autocomplete // Copy, to be sure the original config is unchanged
        });
        return field;
      });

    // For DEV only --
    this.debug = !environment.production;
  }

  ngOnInit() {
    super.ngOnInit();

    // Update filter when changes
    this.registerSubscription(
      this.filterForm.valueChanges
        .pipe(
          debounceTime(250),
          filter(() => this.filterForm.valid)
        )
        // Applying the filter
        .subscribe(json => this.setFilter(json, { emitEvent: this.mobile })));

    this.registerSubscription(
      this.onRefresh.subscribe(() => {
        this.filterIsEmpty = PersonFilter.isEmpty(this.filter);
        this.filterForm.markAsUntouched();
        this.filterForm.markAsPristine();
        this.cd.markForCheck();
      }));

  }

  referentialToString = referentialToString;

  /* -- protected methods -- */

  protected markForCheck() {
    this.cd.markForCheck();
  }

}

