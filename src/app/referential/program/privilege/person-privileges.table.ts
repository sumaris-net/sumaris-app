import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { InMemoryEntitiesService, PersonService, PersonUtils, ReferentialRef, StatusIds } from '@sumaris-net/ngx-components';
import { ReferentialFilter } from '@app/referential/services/filter/referential.filter';
import { ProgramPersonValidatorService } from '@app/referential/program/privilege/program-person.validator';
import { ProgramPerson, ProgramPersonFilter } from '@app/referential/services/model/program.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { AppBaseTable } from '@app/shared/table/base.table';

@Component({
  selector: 'app-person-privileges-table',
  templateUrl: 'person-privileges.table.html',
  styleUrls: ['./person-privileges.table.scss'],
  providers: [
    { provide: ValidatorService, useExisting: ProgramPersonValidatorService },
    {
      provide: InMemoryEntitiesService,
      useFactory: () =>
        new InMemoryEntitiesService(ProgramPerson, ProgramPersonFilter, {
          equals: ProgramPerson.equals,
        }),
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonPrivilegesTable extends AppBaseTable<ProgramPerson, ProgramPersonFilter> implements OnInit {
  protected displayAttributes = {
    department: undefined,
  };

  @Input() title: string = null;
  @Input() locationLevelIds: number[] = null;

  set value(data: ProgramPerson[]) {
    this.setValue(data);
  }

  get value(): ProgramPerson[] {
    return this.getValue();
  }

  constructor(
    memoryDataService: InMemoryEntitiesService<ProgramPerson, ProgramPersonFilter>,
    validatorService: ValidatorService,
    protected personService: PersonService,
    protected referentialRefService: ReferentialRefService
  ) {
    super(
      ProgramPerson,
      ProgramPersonFilter,
      ['person', 'department', 'privilege', 'location', 'referencePerson'],
      memoryDataService,
      validatorService
    );

    this.defaultSortBy = 'id';
    this.defaultSortDirection = 'asc';
    this.i18nColumnPrefix = 'PROGRAM.PRIVILEGES.';
    this.inlineEdition = true;
    this.confirmBeforeDelete = false;
    this.confirmBeforeCancel = false;
    this.undoableDeletion = false;

    this.saveBeforeDelete = true;
    this.saveBeforeSort = true;
    this.saveBeforeFilter = true;
  }

  ngOnInit() {
    super.ngOnInit();

    // Person autocomplete
    this.registerAutocompleteField('person', {
      showAllOnFocus: false,
      service: this.personService,
      filter: {
        statusIds: [StatusIds.TEMPORARY, StatusIds.ENABLE],
      },
      attributes: ['lastName', 'firstName', 'department.name'],
      displayWith: PersonUtils.personToString,
      mobile: this.mobile,
    });
    this.memoryDataService.addSortByReplacement('person', 'person.' + this.autocompleteFields.person.attributes[0]);

    // Department
    this.displayAttributes.department = this.settings.getFieldDisplayAttributes('department');
    this.memoryDataService.addSortByReplacement('department', 'department.' + this.displayAttributes.department[0]);

    this.registerAutocompleteField('privilege', {
      service: this.referentialRefService,
      filter: {
        entityName: 'ProgramPrivilege',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      attributes: ['name'],
      mobile: this.mobile,
    });
    this.memoryDataService.addSortByReplacement('privilege', 'privilege.name');

    this.registerAutocompleteField<ReferentialRef, ReferentialFilter>('location', {
      showAllOnFocus: false,
      suggestFn: (value, filter) =>
        this.referentialRefService.suggest(value, {
          ...filter,
          levelIds: this.locationLevelIds,
        }),
      filter: {
        entityName: 'Location',
        statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
      },
      mobile: this.mobile,
    });
    this.memoryDataService.addSortByReplacement('location', 'location.' + this.autocompleteFields.location.attributes[0]);
  }

  /**
   * Allow to set value
   *
   * @param data
   * @param opts
   */
  setValue(data: ProgramPerson[], opts?: { emitEvent?: boolean }) {
    this.memoryDataService.value = data;
    //this.markAsLoaded();
  }

  getValue(): ProgramPerson[] {
    return this.memoryDataService.value;
  }
}
