import {Injectable} from "@angular/core";
import gql from "graphql-tag";
import {Apollo} from "apollo-angular";
import {Observable} from "rxjs-compat";
import {BaseDataService, environment, isNotNil} from "../../core/core.module";
import {map} from "rxjs/operators";

import {ErrorCodes} from "./trip.errors";
import {AccountService} from "../../core/services/account.service";
import {ExtractionResult, ExtractionType} from "./extraction.model";
import {FetchPolicy} from "apollo-client";


//import {Workbook} from 'exceljs';
import * as fs from 'file-saver';
import {DateFormatPipe} from "../../shared/pipes/date-format.pipe";
import {TranslateService} from "@ngx-translate/core";
import {variable} from "@angular/compiler/src/output/output_ast";
//import {DatePipe} from "@angular/common";

const DOWNLOAD_BULK_SIZE = 1000;


export declare class ExtractionFilter {
  searchText?: string;
  criteria?: ExtractionFilterCriterion[];
}

export declare class ExtractionFilterCriterion {
  name: string;
  value: string;
}
const LoadTypes: any = gql`
  query ExtractionTypes{
    extractionTypes {
      label
      category
    }
  }
`;

const LoadRowsQuery: any = gql`
  query ExtractionRows($type: ExtractionTypeVOInput, $filter: ExtractionFilterVOInput, $offset: Int, $size: Int, $sortBy: String, $sortDirection: String){
    extraction(type: $type, filter: $filter, offset: $offset, size: $size, sortBy: $sortBy, sortDirection: $sortDirection){
      columns {
        name
        type
        description
        rankOrder
      }
      rows
      total
    }    
  }
`;


@Injectable()
export class ExtractionService extends BaseDataService{

  constructor(
    protected apollo: Apollo,
    protected accountService: AccountService,
    protected datePipe: DateFormatPipe,
    protected translate: TranslateService
  ) {
    super(apollo);

    // FOR DEV ONLY
    this._debug = !environment.production;
  }

  /**
   * Load extraction types
   */
  loadTypes(category?: string): Observable<ExtractionType[]> {
    if (this._debug) console.debug("[extraction-service] Loading extractions...");
    const now = Date.now();
    return this.watchQuery<{ extractionTypes: ExtractionType[] }>({
      query: LoadTypes,
      variables: null,
      error: { code: ErrorCodes.LOAD_EXTRACTION_TYPES_ERROR, message: "EXTRACTION.ERROR.LOAD_EXTRACTION_TYPES_ERROR" }
    })
      .pipe(
        map((data) => {
          const types = (data && data.extractionTypes || []);

          // Compute type name
          types.forEach(type => {
            type.name = `EXTRACTION.${type.category.toUpperCase()}.${type.label.toUpperCase()}.TITLE`;
          });

          if (this._debug) console.debug(`[extraction-service] Extraction types loaded in ${Date.now() - now}...`, types);

          return types;
        })
      );
  }

  /**
   * Load many trips
   * @param offset
   * @param size
   * @param sortBy
   * @param sortDirection
   * @param filter
   */
  async loadRows(
          type: ExtractionType,
          offset: number,
          size: number,
          sortBy?: string,
          sortDirection?: string,
          filter?: ExtractionFilter,
          options?: {
            fetchPolicy?: FetchPolicy
          }): Promise<ExtractionResult> {

    const variables: any = {
      type: {
        category: type.category,
        label: type.label
      },
      offset: offset || 0,
      size: size || 100,
      sortBy: sortBy || 'id',
      sortDirection: sortDirection || 'asc',
      filter: {
        // TODO add filter
        criteria : filter && filter.criteria || undefined
      }
    };

    this._lastVariables.loadAll = variables;

    const now = Date.now();
    if (this._debug) console.debug(`[extraction-service] Loading rows ${type.category} ${type.label}... using options:`, variables);

    const res = await this.query<{ extraction: ExtractionResult }>({
      query: LoadRowsQuery,
      variables: variables,
      error: { code: ErrorCodes.LOAD_EXTRACTION_ROWS_ERROR, message: "EXTRACTION.ERROR.LOAD_EXTRACTION_ROWS_ERROR" },
      fetchPolicy: options && options.fetchPolicy || 'network-only'
    });

    const data = res && res.extraction;
    if (!data) return null;

    // Add index on each column
    data.columns.forEach( (c, index) => c.index = index);

    if (this._debug) console.debug(`[extraction-service] Rows ${type.category} ${type.label} loaded in ${Date.now() - now}ms`, data);

    return data;
  }

  public async downloadAsFile(type: ExtractionType,
                              displayColumns: String[],
                              filter?: ExtractionFilter
                              ) {


    const variables: any = {
      type: {
        category: type.category,
        label: type.label
      },
      offset: 0,
      size: DOWNLOAD_BULK_SIZE,
      filter: {
        criteria : filter && filter.criteria || undefined
      }
    };

    const defaultNameKey = `EXTRACTION.${type.category}.${type.label}.TITLE`.toUpperCase();
    const basename = this.translate.instant(type.name || defaultNameKey);

    const now = Date.now();
    if (this._debug) console.debug(`[extraction-service] Downloading ${type.category} ${type.label}... using options:`, variables);

    let total = -1;
    let rowMapper, indexMapper, valueMapper, content;
    do {

      if (this._debug) console.debug(`[extraction-service] Downloading rows [${variables.offset}, ${variables.offset + variables.size}]...`);
      const res = await this.query<{ extraction: ExtractionResult }>({
        query: LoadRowsQuery,
        variables: variables,
        error: { code: ErrorCodes.DOWNLOAD_EXTRACTION_ROWS_ERROR, message: "EXTRACTION.ERROR.DOWNLOAD_EXTRACTION_ROWS_ERROR" },
        fetchPolicy: 'network-only'
      });

      const data = res && res.extraction;

      if (!data || data.total == 0) {
        if (this._debug) console.debug("[extraction-service] No rows to extract. Skipping file generation");
        return; // no data
      }

      // If first result
      if (variables.offset == 0) {
        // Add index on each column
        data.columns.forEach( (c, index) => c.index = index);

        // Get columns headers
        displayColumns = displayColumns || data.columns.map(c => c.name);
        content = displayColumns.join(",");
        content += "\n";

        const orderedColumns = displayColumns
          .map( displayColumn => data.columns.find(c => c.name == displayColumn));
        const indexMapper = orderedColumns.map(c => c.index);
        const valueMapper = orderedColumns.map(column => {
          if (column.type == 'string') return (value) => isNotNil(value) && ("\"" + value + "\"") || undefined;
          // Default converter
          return (value) => value;
        });
        rowMapper = (row) => (indexMapper
          .map((i) => row[i])
          .map((value, index) => valueMapper[index](value))
          .join(',') + '\n');
      }

      data.rows.forEach(row => content += rowMapper(row));

      if (total == -1) total = data.total;
      variables.offset += variables.size;
    }
    while(variables.offset<total)

    content += "\n";


    let blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
    fs.saveAs(blob, basename + '.csv');

    if (this._debug) console.debug(`[extraction-service] File downloaded in ${Date.now() - now}ms`);
  }



}
