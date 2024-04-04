import { __decorate, __metadata } from "tslib";
import { ChangeDetectionStrategy, Component, Injector, Input } from '@angular/core';
import { ValidatorService } from '@e-is/ngx-material-table';
import { AppInMemoryTable, InMemoryEntitiesService, PersonService, PersonUtils, Referential, ReferentialUtils, RESERVED_END_COLUMNS, RESERVED_START_COLUMNS, StatusIds, } from '@sumaris-net/ngx-components';
import { ReferentialFilter } from '@app/referential/services/filter/referential.filter';
import { ProgramPersonValidatorService } from '@app/referential/program/privilege/program-person.validator';
import { ProgramPerson } from '@app/referential/services/model/program.model';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
let PersonPrivilegesTable = class PersonPrivilegesTable extends AppInMemoryTable {
    constructor(injector, validatorService, memoryDataService, personService, referentialRefService) {
        super(injector, RESERVED_START_COLUMNS.concat(['person', 'department', 'privilege', 'location']).concat(RESERVED_END_COLUMNS), ProgramPerson, memoryDataService, validatorService);
        this.validatorService = validatorService;
        this.memoryDataService = memoryDataService;
        this.personService = personService;
        this.referentialRefService = referentialRefService;
        this.showToolbar = true;
        this.showError = true;
        this.useSticky = false;
        this.title = null;
        this.locationLevelIds = null;
        this.displayAttributes = {
            department: undefined,
        };
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
        this.registerAutocompleteField('location', {
            showAllOnFocus: false,
            suggestFn: (value, filter) => this.referentialRefService.suggest(value, Object.assign(Object.assign({}, filter), { levelIds: this.locationLevelIds })),
            filter: {
                entityName: 'Location',
                statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY],
            },
            mobile: this.mobile,
        });
        this.memoryDataService.addSortByReplacement('location', 'location.' + this.autocompleteFields.location.attributes[0]);
    }
};
__decorate([
    Input(),
    __metadata("design:type", Object)
], PersonPrivilegesTable.prototype, "showToolbar", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PersonPrivilegesTable.prototype, "showError", void 0);
__decorate([
    Input(),
    __metadata("design:type", Object)
], PersonPrivilegesTable.prototype, "useSticky", void 0);
__decorate([
    Input(),
    __metadata("design:type", String)
], PersonPrivilegesTable.prototype, "title", void 0);
__decorate([
    Input(),
    __metadata("design:type", Array)
], PersonPrivilegesTable.prototype, "locationLevelIds", void 0);
PersonPrivilegesTable = __decorate([
    Component({
        selector: 'app-person-privileges-table',
        templateUrl: 'person-privileges.table.html',
        styleUrls: ['./person-privileges.table.scss'],
        providers: [
            { provide: ValidatorService, useExisting: ProgramPersonValidatorService },
            {
                provide: InMemoryEntitiesService,
                useFactory: () => new InMemoryEntitiesService(Referential, ReferentialFilter, {
                    equals: ReferentialUtils.equals,
                }),
            },
        ],
        changeDetection: ChangeDetectionStrategy.OnPush,
    }),
    __metadata("design:paramtypes", [Injector,
        ValidatorService,
        InMemoryEntitiesService,
        PersonService,
        ReferentialRefService])
], PersonPrivilegesTable);
export { PersonPrivilegesTable };
//# sourceMappingURL=person-privileges.table.js.map