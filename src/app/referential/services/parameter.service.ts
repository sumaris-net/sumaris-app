import {Injectable} from "@angular/core";
import {gql} from "@apollo/client/core";
import {ErrorCodes} from "./errors";
import { AccountService, AppErrorWithDetails, isEmptyArray, isNilOrBlank, ReferentialUtils } from '@sumaris-net/ngx-components';
import {GraphqlService}  from "@sumaris-net/ngx-components";
import {ReferentialService} from "./referential.service";
import {Observable, of} from "rxjs";
import {Parameter} from "./model/parameter.model";
import {ReferentialFragments} from "./referential.fragments";
import {EntityServiceLoadOptions, IEntityService} from "@sumaris-net/ngx-components";
import {isNil, isNotNil} from "@sumaris-net/ngx-components";
import {BaseGraphqlService}  from "@sumaris-net/ngx-components";
import {environment} from "../../../environments/environment";
import {StatusIds}  from "@sumaris-net/ngx-components";
import {EntityUtils}  from "@sumaris-net/ngx-components";

const SaveQuery: any = gql`
  mutation SaveParameter($parameter:ParameterVOInput){
    saveParameter(parameter: $parameter){
      ...ParameterFragment
    }
  }
  ${ReferentialFragments.referential}
  ${ReferentialFragments.parameter}
`;

const LoadQuery: any = gql`
  query Parameter($label: String, $id: Int){
    parameter(label: $label, id: $id){
      ...ParameterFragment
    }
  }
  ${ReferentialFragments.referential}
  ${ReferentialFragments.parameter}
`;

@Injectable({providedIn: 'root'})
export class ParameterService extends BaseGraphqlService implements IEntityService<Parameter> {

  constructor(
    protected graphql: GraphqlService,
    protected accountService: AccountService,
    protected referentialService: ReferentialService
  ) {
    super(graphql, environment);
  }

  async existsByLabel(label: string, opts?: { excludedId?: number; }): Promise<boolean> {
    if (isNil(label)) return false;
    return await this.referentialService.existsByLabel(label, { ...opts, entityName: 'Parameter' });
  }

  async load(id: number, options?: EntityServiceLoadOptions): Promise<Parameter> {

    if (this._debug) console.debug(`[parameter-service] Loading parameter {${id}}...`);

    const res = await this.graphql.query<{ parameter: any }>({
      query: LoadQuery,
      variables: {
        id: id
      },
      error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"}
    });
    const entity = res && Parameter.fromObject(res.parameter);

    if (this._debug) console.debug(`[pmfm-service] Parameter {${id}} loaded`, entity);

    return entity;
  }

  async loadByLabel(label: string, opts?: EntityServiceLoadOptions): Promise<Parameter> {

    if (this._debug) console.debug(`[parameter-service] Loading parameter {${label}}...`);

    const res = await this.graphql.query<{ parameter: any }>({
      query: LoadQuery,
      variables: {
        label
      },
      error: {code: ErrorCodes.LOAD_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.LOAD_REFERENTIAL_ERROR"},
      fetchPolicy: opts && opts.fetchPolicy || undefined
    });
    const entity = (!opts || opts.toEntity !== false)
      ? res && Parameter.fromObject(res.parameter)
      : res && res.parameter as Parameter;

    if (this._debug) console.debug(`[parameter-service] Parameter {${label}} loaded`, entity);

    return entity;
  }


  async loadAllByLabels(labels: string[],
                        options?: EntityServiceLoadOptions): Promise<Parameter[]> {
    if (isEmptyArray(labels)) throw new Error('Missing required argument \'labels\'');
    const items = await Promise.all(
      labels.map(label => this.loadByLabel(label, options)
        .catch(err => {
          if (err && err.code === ErrorCodes.LOAD_REFERENTIAL_ERROR) return undefined; // Skip if not found
          throw err;
        }))
    );
    return items.filter(isNotNil);
  }

  canUserWrite(data: Parameter, opts?: any): boolean {
    return this.accountService.isAdmin();
  }

  /**
   * Save a parameter entity
   * @param entity
   */
  async save(entity: Parameter, options?: EntityServiceLoadOptions): Promise<Parameter> {
    if (isNilOrBlank(entity?.label)) throw new Error('Missing a required label');

    this.fillDefaultProperties(entity);

    // Transform into json
    const json = entity.asObject();

    const now = Date.now();
    if (this._debug) console.debug(`[parameter-service] Saving Parameter...`, json);

    // Check label not exists (if new entity)
    if (isNil(entity.id)) {
      const exists = await this.existsByLabel(entity.label);
      if (exists) {
        throw {code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: 'REFERENTIAL.ERROR.LABEL_NOT_UNIQUE'};
      }
    }

    await this.graphql.mutate<{ saveParameter: any }>({
      mutation: SaveQuery,
      variables: {
        parameter: json
      },
      error: { code: ErrorCodes.SAVE_REFERENTIAL_ERROR, message: "REFERENTIAL.ERROR.SAVE_REFERENTIAL_ERROR" },
      update: (proxy, {data}) => {
        // Update entity
        const savedEntity = data && data.saveParameter;
        if (savedEntity) {
          if (this._debug) console.debug(`[parameter-service] Parameter saved in ${Date.now() - now}ms`, entity);
          this.copyIdAndUpdateDate(savedEntity, entity);
        }
      }
    });

    return entity;
  }

  /**
   * Delete parameter entities
   */
  async delete(entity: Parameter, options?: any): Promise<any> {

    entity.entityName = 'Parameter';

    await this.referentialService.delete(entity);
  }

  listenChanges(id: number, options?: any): Observable<Parameter | undefined> {
    // TODO
    console.warn("TODO: implement listen changes on parameter");
    return of();
  }

  /* -- protected methods -- */


  protected fillDefaultProperties(entity: Parameter) {
    entity.statusId = isNotNil(entity.statusId) ? entity.statusId : StatusIds.ENABLE;
  }

  protected copyIdAndUpdateDate(source: Parameter, target: Parameter) {
    EntityUtils.copyIdAndUpdateDate(source, target);

    // Update qualitative values
    if (source.qualitativeValues && target.qualitativeValues) {
      target.qualitativeValues.forEach(entity => {

        entity.levelId = source.id;
        const savedQualitativeValue = source.qualitativeValues.find(json => entity.equals(json));
        EntityUtils.copyIdAndUpdateDate(savedQualitativeValue, entity);
      });
    }

  }
}
