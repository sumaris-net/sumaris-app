import { __awaiter, __decorate, __metadata } from "tslib";
import { Directive, Injector } from '@angular/core';
import { AccountService, BaseEntityService, EntityUtils, GraphqlService, isNil, isNotNil, PlatformService, } from '@sumaris-net/ngx-components';
import { RootDataEntityUtils } from './model/root-data-entity.model';
import { DataErrorCodes } from './errors';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';
import { of } from 'rxjs';
let BaseRootDataService = class BaseRootDataService extends BaseEntityService {
    constructor(injector, dataType, filterType, options) {
        super(injector.get(GraphqlService), injector.get(PlatformService), dataType, filterType, options);
        this.accountService = this.accountService || (injector && injector.get(AccountService)) || undefined;
        this.programRefService = this.programRefService || (injector && injector.get(ProgramRefService)) || undefined;
    }
    canUserWrite(entity, opts) {
        return (EntityUtils.isLocal(entity) || // For performance, always give write access to local data
            this.accountService.isAdmin() ||
            (this.programRefService.canUserWriteEntity(entity, opts) && (isNil(entity.validationDate) || this.accountService.isSupervisor())));
    }
    listenChanges(id, opts) {
        if (EntityUtils.isLocalId(+id))
            return of();
        return super.listenChanges(id, opts);
    }
    terminate(entity, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.mutations.terminate)
                throw Error('Not implemented');
            if (isNil(entity.id) || +entity.id < 0) {
                throw new Error('Entity must be saved before terminate!');
            }
            // Fill options
            opts = yield this.fillTerminateOption(entity, opts);
            // Prepare to save
            this.fillDefaultProperties(entity);
            // Transform into json
            const json = this.asObject(entity);
            const now = this._debug && Date.now();
            if (this._debug)
                console.debug(this._logPrefix + `Terminate entity {${entity.id}}...`, json);
            yield this.graphql.mutate({
                mutation: this.mutations.terminate,
                variables: {
                    data: json,
                    options: (opts === null || opts === void 0 ? void 0 : opts.withChildren) ? { withChildren: true } : undefined,
                },
                error: { code: DataErrorCodes.TERMINATE_ENTITY_ERROR, message: 'ERROR.TERMINATE_ENTITY_ERROR' },
                update: (proxy, { data }) => {
                    this.copyIdAndUpdateDate(data && data.data, entity);
                    if (this._debug)
                        console.debug(this._logPrefix + `Entity terminated in ${Date.now() - now}ms`, entity);
                },
            });
            return entity;
        });
    }
    /**
     * Validate an root entity
     *
     * @param entity
     */
    validate(entity, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.mutations.validate)
                throw Error('Not implemented');
            if (isNil(entity.id) || EntityUtils.isLocal(entity)) {
                throw new Error('Entity must be saved once before validate !');
            }
            if (isNil(entity.controlDate)) {
                throw new Error('Entity must be controlled before validate !');
            }
            if (isNotNil(entity.validationDate)) {
                throw new Error('Entity is already validated !');
            }
            // Fill options
            opts = yield this.fillValidateOption(entity, opts);
            // Prepare to save
            this.fillDefaultProperties(entity);
            // Transform into json
            const json = this.asObject(entity);
            const now = Date.now();
            if (this._debug)
                console.debug(this._logPrefix + `Validate entity {${entity.id}}...`, json);
            yield this.graphql.mutate({
                mutation: this.mutations.validate,
                variables: {
                    data: json,
                    options: (opts === null || opts === void 0 ? void 0 : opts.withChildren) ? { withChildren: true } : undefined,
                },
                error: { code: DataErrorCodes.VALIDATE_ENTITY_ERROR, message: 'ERROR.VALIDATE_ENTITY_ERROR' },
                update: (cache, { data }) => {
                    this.copyIdAndUpdateDate(data && data.data, entity);
                    if (this._debug)
                        console.debug(this._logPrefix + `Entity validated in ${Date.now() - now}ms`, entity);
                    this.refetchMutableWatchQueries({ queries: this.getLoadQueries() });
                },
            });
            return entity;
        });
    }
    unvalidate(entity, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.mutations.unvalidate)
                throw Error('Not implemented');
            if (isNil(entity.validationDate)) {
                throw new Error('Entity is not validated yet !');
            }
            // Fill options
            opts = yield this.fillValidateOption(entity, opts);
            // Prepare to save
            this.fillDefaultProperties(entity);
            // Transform into json
            const json = this.asObject(entity);
            const now = Date.now();
            if (this._debug)
                console.debug(this._logPrefix + 'Unvalidate entity...', json);
            yield this.graphql.mutate({
                mutation: this.mutations.unvalidate,
                variables: {
                    data: json,
                    options: (opts === null || opts === void 0 ? void 0 : opts.withChildren) ? { withChildren: true } : undefined,
                },
                context: {
                    // TODO serializationKey:
                    tracked: true,
                },
                error: { code: DataErrorCodes.UNVALIDATE_ENTITY_ERROR, message: 'ERROR.UNVALIDATE_ENTITY_ERROR' },
                update: (proxy, { data }) => {
                    const savedEntity = data && data.data;
                    if (savedEntity) {
                        if (savedEntity !== entity) {
                            this.copyIdAndUpdateDate(savedEntity, entity);
                        }
                        if (this._debug)
                            console.debug(this._logPrefix + `Entity unvalidated in ${Date.now() - now}ms`, entity);
                    }
                    this.refetchMutableWatchQueries({ queries: this.getLoadQueries() });
                },
            });
            return entity;
        });
    }
    qualify(entity, qualityFlagId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.mutations.qualify)
                throw Error('Not implemented');
            if (isNil(entity.validationDate)) {
                throw new Error('Entity is not validated yet !');
            }
            // Prepare to save
            this.fillDefaultProperties(entity);
            // Transform into json
            const json = this.asObject(entity);
            json.qualityFlagId = qualityFlagId;
            const now = Date.now();
            if (this._debug)
                console.debug(this._logPrefix + 'Qualifying entity...', json);
            yield this.graphql.mutate({
                mutation: this.mutations.qualify,
                variables: {
                    data: json,
                },
                error: { code: DataErrorCodes.QUALIFY_ENTITY_ERROR, message: 'ERROR.QUALIFY_ENTITY_ERROR' },
                update: (cache, { data }) => {
                    const savedEntity = data && data.data;
                    this.copyIdAndUpdateDate(savedEntity, entity);
                    RootDataEntityUtils.copyQualificationDateAndFlag(savedEntity, entity);
                    if (this._debug)
                        console.debug(this._logPrefix + `Entity qualified in ${Date.now() - now}ms`, entity);
                },
            });
            return entity;
        });
    }
    copyIdAndUpdateDate(source, target) {
        if (!source)
            return;
        EntityUtils.copyIdAndUpdateDate(source, target);
        // Copy control and validation date
        RootDataEntityUtils.copyControlAndValidationDate(source, target);
    }
    /* -- protected methods -- */
    asObject(entity, opts) {
        opts = Object.assign(Object.assign({}, MINIFY_OPTIONS), opts);
        const copy = entity.asObject(opts);
        if (opts && opts.minify) {
            // Comment because need to keep recorder person
            copy.recorderPerson =
                entity.recorderPerson &&
                    {
                        id: entity.recorderPerson.id,
                        firstName: entity.recorderPerson.firstName,
                        lastName: entity.recorderPerson.lastName,
                    };
            // Keep id only, on department
            copy.recorderDepartment = (entity.recorderDepartment && { id: entity.recorderDepartment && entity.recorderDepartment.id }) || undefined;
        }
        return copy;
    }
    fillDefaultProperties(entity) {
        // If new entity
        const isNew = isNil(entity.id);
        if (isNew) {
            const person = this.accountService.person;
            // Recorder department
            if (person && person.department && !entity.recorderDepartment) {
                entity.recorderDepartment = person.department;
            }
            // Recorder person
            if (person && person.id && !entity.recorderPerson) {
                entity.recorderPerson = person;
            }
        }
    }
    fillRecorderDepartment(entities, department) {
        if (isNil(entities))
            return;
        if (!Array.isArray(entities)) {
            entities = [entities];
        }
        department = department || this.accountService.department;
        entities.forEach((entity) => {
            if (!entity.recorderDepartment || !entity.recorderDepartment.id) {
                // Recorder department
                if (department) {
                    entity.recorderDepartment = department;
                }
            }
        });
    }
    fillTerminateOption(entity, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fillProgramOptions(entity, opts);
        });
    }
    fillValidateOption(entity, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fillProgramOptions(entity, opts);
        });
    }
    fillProgramOptions(entity, opts) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            opts = opts || {};
            // Load program (need only properties)
            const programLabel = (_a = entity === null || entity === void 0 ? void 0 : entity.program) === null || _a === void 0 ? void 0 : _a.label;
            if (((_b = opts.program) === null || _b === void 0 ? void 0 : _b.label) !== programLabel) {
                opts.program = yield this.programRefService.loadByLabel(programLabel);
            }
            return opts;
        });
    }
    resetQualityProperties(entity) {
        entity.controlDate = undefined;
        entity.validationDate = undefined;
        entity.qualificationDate = undefined;
        entity.qualityFlagId = undefined;
        // Do not reset qualification comments, because used to hold control errors
    }
};
BaseRootDataService = __decorate([
    Directive()
    // tslint:disable-next-line:directive-class-suffix
    ,
    __metadata("design:paramtypes", [Injector, Function, Function, Object])
], BaseRootDataService);
export { BaseRootDataService };
//# sourceMappingURL=root-data-service.class.js.map