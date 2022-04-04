import {ChangeDetectionStrategy, Component, Injector, Input} from '@angular/core';
import {ValidatorService} from '@e-is/ngx-material-table';
import {
  AppInMemoryTable,
  InMemoryEntitiesService,
  PersonFilter,
  PersonService,
  PersonUtils,
  Referential, ReferentialRef,
  ReferentialUtils,
  RESERVED_END_COLUMNS,
  RESERVED_START_COLUMNS,
  StatusIds
} from '@sumaris-net/ngx-components';
import {ReferentialFilter} from '@app/referential/services/filter/referential.filter';
import {ProgramPersonValidatorService} from '@app/referential/program/privilege/program-person.validator';
import {ProgramPerson} from '@app/referential/services/model/program.model';
import {ReferentialRefService} from '@app/referential/services/referential-ref.service';

@Component({
  selector: 'app-person-privileges-table',
  templateUrl: 'person-privileges.table.html',
  styleUrls: ['./person-privileges.table.scss'],
  providers: [
    {provide: ValidatorService, useExisting: ProgramPersonValidatorService},
    {
      provide: InMemoryEntitiesService,
      useFactory: () => {
        return new InMemoryEntitiesService(Referential, ReferentialFilter, {
          equals: ReferentialUtils.equals
        });
      }
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PersonPrivilegesTable extends AppInMemoryTable<ProgramPerson, PersonFilter> {

  @Input() showToolbar = true;
  @Input() showError = true;
  @Input() useSticky = false;
  @Input() title: string = null;
  @Input() locationLevelIds: number[] = null;

  displayAttributes = {
    department: undefined
  };

  constructor(
    injector: Injector,
    protected validatorService: ValidatorService,
    protected memoryDataService: InMemoryEntitiesService<ProgramPerson, PersonFilter>,
    protected personService: PersonService,
    protected referentialRefService: ReferentialRefService
  ) {
    super(injector,
      RESERVED_START_COLUMNS.concat([
        'person',
        'department',
        'privilege',
        'location'
      ]).concat(RESERVED_END_COLUMNS),
      ProgramPerson,
      memoryDataService,
      validatorService);

    this.defaultSortDirection = 'asc';
    this.defaultSortBy = 'id';
    this.i18nColumnPrefix = 'PROGRAM.PRIVILEGES.';
    this.inlineEdition = true;

  }

  ngOnInit() {
    super.ngOnInit();

    // Person autocomplete
    this.registerAutocompleteField('person', {
      showAllOnFocus: false,
      service: this.personService,
      filter: {
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE]
      },
      attributes: ['lastName', 'firstName', 'department.name'],
      displayWith: PersonUtils.personToString,
      mobile: this.mobile
    });
    this.memoryDataService.addSortByReplacement('person', 'person.' + this.autocompleteFields.person.attributes[0]);

    // Department
    this.displayAttributes.department = this.settings.getFieldDisplayAttributes('department');
    this.memoryDataService.addSortByReplacement('department', 'department.' + this.displayAttributes.department[0]);

    this.registerAutocompleteField('privilege', {
      service: this.referentialRefService,
      filter: {
        entityName: 'ProgramPrivilege',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      },
      attributes: ['name'],
      mobile: this.mobile
    });
    this.memoryDataService.addSortByReplacement('privilege', 'privilege.name');

    this.registerAutocompleteField<ReferentialRef, ReferentialFilter>('location', {
      showAllOnFocus: false,
      suggestFn: (value, filter) => this.referentialRefService.suggest(value, {
        ...filter,
        levelIds: this.locationLevelIds
      }),
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY]
      },
      mobile: this.mobile
    });
    this.memoryDataService.addSortByReplacement('location', 'location.' + this.autocompleteFields.location.attributes[0]);

  }

}
