import { __awaiter, __decorate, __metadata } from "tslib";
import { Injectable } from '@angular/core';
import { gql } from '@apollo/client/core';
import { of } from 'rxjs';
import { filter, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { AccountService, BaseEntityService, GraphqlService, isNil, isNilOrBlank, isNotEmptyArray, PlatformService, propertyComparator, ReferentialUtils, StatusIds, } from '@sumaris-net/ngx-components';
import { ExtractionType, ExtractionTypeUtils } from './extraction-type.model';
import { ExtractionTypeFilter } from '@app/extraction/type/extraction-type.filter';
import { ProgramRefService } from '@app/referential/services/program-ref.service';
import { ProgramProperties } from '@app/referential/services/config/program.config';
import { TranslateService } from '@ngx-translate/core';
import { intersectArrays } from '@app/shared/functions';
import { DataCommonFragments } from "@app/trip/common/data.fragments";
export const ExtractionTypeFragments = {
    lightType: gql `
    fragment LightExtractionTypeFragment on ExtractionTypeVO {
      id
      label
      name
      format
      version
      updateDate
    }
  `,
    type: gql `
    fragment ExtractionTypeFragment on ExtractionTypeVO {
      id
      label
      name
      format
      version
      description
      docUrl
      updateDate
      comments
      isSpatial
      statusId
      sheetNames
      processingFrequencyId
      recorderPerson {
        ...LightPersonFragment
      }
      recorderDepartment {
        ...LightDepartmentFragment
      }
    }
    ${DataCommonFragments.lightDepartment}
    ${DataCommonFragments.lightPerson}
  `,
};
const Queries = {
    loadAll: gql `query ExtractionTypes($filter: ExtractionTypeFilterVOInput) {
      data: extractionTypes(filter: $filter) {
        ...ExtractionTypeFragment
      }
    }
    ${ExtractionTypeFragments.type}`,
};
const fixWorkaroundDataFn = ({ data, total }) => {
    // Workaround because saveAggregation() doest not add NEW extraction type correctly
    data = (data || []).filter(e => {
        if (isNil(e === null || e === void 0 ? void 0 : e.label)) {
            console.warn('[extraction-service] FIXME: Invalid extraction type (no format)... bad cache insertion in saveAggregation() ?');
            return false;
        }
        return true;
    });
    return { data, total };
};
let ExtractionTypeService = class ExtractionTypeService extends BaseEntityService {
    constructor(graphql, platformService, accountService, programRefService, translate) {
        super(graphql, platformService, ExtractionType, ExtractionTypeFilter, {
            queries: Queries
        });
        this.graphql = graphql;
        this.platformService = platformService;
        this.accountService = accountService;
        this.programRefService = programRefService;
        this.translate = translate;
    }
    loadAll(offset, size, sortBy, sortDirection, filter, opts) {
        return super.loadAll(offset, size, sortBy, sortDirection, filter, Object.assign(Object.assign({}, opts), { withTotal: false // Always false (loadAllWithTotal query not defined yet)
         }))
            .then(fixWorkaroundDataFn);
    }
    existsByLabel(label, opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (isNilOrBlank(label))
                return false;
            const { data } = yield this.loadAll(0, 1, null, null, {
                label
            }, opts);
            return ReferentialUtils.isNotEmpty(data && data[0]);
        });
    }
    /**
     * Watch products
     */
    watchAll(offset, size, sortBy, sortDirection, filter, options) {
        return super.watchAll(offset, size, sortBy, sortDirection, filter, options)
            .pipe(map(fixWorkaroundDataFn));
    }
    insertIntoCache(cache, entity) {
        if (!entity || isNil(entity.id))
            throw new Error('Extraction type (with an id) is required, to insert into the cache.');
        console.info('[extraction-type-service] Inserting into cache:', entity);
        this.insertIntoMutableCachedQueries(cache, {
            queries: this.getLoadQueries(),
            data: entity
        });
    }
    updateCache(cache, entity) {
        if (!entity || isNil(entity.id))
            throw new Error('Extraction type (with an id) is required, to update the cache.');
        console.info('[extraction-type-service] Updating cache:', entity);
        // Remove, then insert, from extraction types
        const exists = this.removeFromMutableCachedQueriesByIds(cache, {
            queries: this.getLoadQueries(),
            ids: entity.id
        }) > 0;
        if (exists) {
            this.insertIntoMutableCachedQueries(cache, {
                queries: this.getLoadQueries(),
                data: entity
            });
        }
    }
    /**
     * Watch extraction types from given program labels
     *
     * @protected
     */
    watchAllByProgramLabels(programLabels, filter, opts) {
        return of(programLabels)
            .pipe(mergeMap(labels => this.programRefService.loadAllByLabels(labels)), switchMap(programs => this.watchAllByPrograms(programs, filter, opts)));
    }
    /**
     * Watch extraction types from given programs
     *
     * @protected
     */
    watchAllByPrograms(programs, typeFilter, opts) {
        // @ts-ignore
        return of(programs)
            .pipe(filter(isNotEmptyArray), 
        // Get extraction formats of selected programs (apply an intersection)
        map(values => {
            const formatArrays = values.map(program => {
                const programFormats = program.getPropertyAsStrings(ProgramProperties.EXTRACTION_FORMATS);
                if (isNotEmptyArray(programFormats))
                    return programFormats;
                // Not configured in program options: return all formats
                return ProgramProperties.EXTRACTION_FORMATS.values
                    .map(item => { var _a; return (_a = item.key) === null || _a === void 0 ? void 0 : _a.toUpperCase(); }) // Extract the format (from option's key)
                    .filter(format => format !== 'NA'); // Skip the 'NA' format
            });
            if (formatArrays.length === 1)
                return formatArrays[0];
            return intersectArrays(formatArrays);
        }), 
        // DEBUG
        tap(formats => console.debug(`[extraction-type-service] Watching types, filtered by formats [${formats.join(', ')}] ...`)), 
        // Load extraction types, from program's formats
        switchMap(formats => this.watchAll(0, 100, null, null, Object.assign(Object.assign({ statusIds: [StatusIds.ENABLE, StatusIds.TEMPORARY], isSpatial: false, category: 'LIVE' }, typeFilter), { formats }), opts)), 
        // Translate types, and sort
        map(({ data }) => 
        // Compute i18n name
        data.map(t => ExtractionTypeUtils.computeI18nName(this.translate, t))
            // Then sort by name
            .sort(propertyComparator('name'))));
    }
};
ExtractionTypeService = __decorate([
    Injectable({ providedIn: 'root' }),
    __metadata("design:paramtypes", [GraphqlService,
        PlatformService,
        AccountService,
        ProgramRefService,
        TranslateService])
], ExtractionTypeService);
export { ExtractionTypeService };
//# sourceMappingURL=extraction-type.service.js.map