import { DataEntity, DataEntityAsObjectOptions } from './model/data-entity.model';
import { Directive, inject, Injector } from '@angular/core';
import {
  AccountService,
  BaseEntityGraphqlMutations,
  BaseEntityGraphqlQueries,
  BaseEntityGraphqlSubscriptions,
  BaseEntityService,
  BaseEntityServiceOptions,
  changeCaseToUnderscore,
  EntitiesServiceWatchOptions,
  EntityServiceLoadOptions,
  GraphqlService,
  IEntityService,
  IFormPathTranslator,
  IFormPathTranslatorOptions,
  isNil,
  PlatformService,
  TranslateContextService,
} from '@sumaris-net/ngx-components';
import { DataEntityFilter } from '@app/data/services/model/data-filter.model';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { MEASUREMENT_PMFM_ID_REGEXP, MEASUREMENT_VALUES_PMFM_ID_REGEXP } from '@app/data/measurement/measurement.model';
import { PmfmNamePipe } from '@app/referential/pipes/pmfms.pipe';
import { MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

export declare interface IDataEntityService<T, ID = any, LO = EntityServiceLoadOptions> extends IEntityService<T, ID, LO>, IFormPathTranslator {}

export interface IDataFormPathTranslatorOptions extends IFormPathTranslatorOptions {
  i18nPmfmPrefix?: string;
  pmfms?: IPmfm[];
}

@Directive()
// tslint:disable-next-line:directive-class-suffix
export abstract class BaseDataService<
    T extends DataEntity<T, ID>,
    F extends DataEntityFilter<F, T, ID> = DataEntityFilter<any, T, any>,
    ID = number,
    WO extends EntitiesServiceWatchOptions = EntitiesServiceWatchOptions,
    LO extends EntityServiceLoadOptions = EntityServiceLoadOptions,
    Q extends BaseEntityGraphqlQueries = BaseEntityGraphqlQueries,
    M extends BaseEntityGraphqlMutations = BaseEntityGraphqlMutations,
    S extends BaseEntityGraphqlSubscriptions = BaseEntityGraphqlSubscriptions,
  >
  extends BaseEntityService<T, F, ID, WO, LO, Q, M, S>
  implements IDataEntityService<T, ID, LO>
{
  protected readonly accountService = inject(AccountService);
  protected readonly pmfmNamePipe = inject(PmfmNamePipe);
  protected readonly translateContext = inject(TranslateContextService);

  protected constructor(injector: Injector, dataType: new () => T, filterType: new () => F, options: BaseEntityServiceOptions<T, ID, Q, M, S>) {
    super(injector.get(GraphqlService), injector.get(PlatformService), dataType, filterType, options);
  }

  translateFormPath(path: string, opts?: IDataFormPathTranslatorOptions): string {
    // Translate path like `measurements.<PMFM>` or `measurementValues.<PMFM>`
    if (opts?.pmfms && (MEASUREMENT_PMFM_ID_REGEXP.test(path) || MEASUREMENT_VALUES_PMFM_ID_REGEXP.test(path))) {
      const pmfmId = parseInt(path.split('.').pop());
      const pmfm = opts.pmfms.find((p) => p.id === pmfmId);
      return this.pmfmNamePipe.transform(pmfm, { i18nPrefix: opts.i18nPmfmPrefix, i18nSuffix: opts.i18nSuffix });
    }

    // Default translation
    const fieldName = path.substring(path.lastIndexOf('.') + 1);
    const i18nKey = (opts?.i18nPrefix || '') + changeCaseToUnderscore(fieldName).toUpperCase();
    return this.translateContext.instant(i18nKey, opts?.i18nSuffix);
  }

  /* -- protected methods -- */

  protected asObject(entity: T, opts?: DataEntityAsObjectOptions): any {
    opts = { ...MINIFY_OPTIONS, ...opts };
    const copy = entity.asObject(opts);

    if (opts.minify) {
      // ONly keep id on recorder department
      copy.recorderDepartment = (entity.recorderDepartment && { id: entity.recorderDepartment && entity.recorderDepartment.id }) || undefined;
    }

    return copy;
  }

  protected fillDefaultProperties(entity: T) {
    // If new entity
    const isNew = isNil(entity.id);
    if (isNew) {
      const person = this.accountService.person;

      // Recorder department
      if (person && person.department && !entity.recorderDepartment) {
        entity.recorderDepartment = person.department;
      }
    }
  }

  protected resetQualityProperties(entity: T) {
    entity.controlDate = undefined;
    entity.qualityFlagId = undefined;
    entity.qualificationDate = undefined;
    // Do NOT reset qualification comments, because used to hold control errors
    //entity.qualificationComments = undefined;
  }
}
