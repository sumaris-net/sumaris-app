import { Injectable } from '@angular/core';
import { FetchPolicy, gql } from '@apollo/client/core';
import { ExtractionCacheDurationType, ExtractionFilter } from '@app/extraction/type/extraction-type.model';
import { BaseGraphqlService, GraphqlService } from '@sumaris-net/ngx-components';
import { ActivityMonitoring, ActivityMonitoringExtractionData } from './activity-calendar-progress-report.model';

const Queries = {
  extraction: gql`
    query Extraction($formatLabel: String!, $filter: ExtractionFilterVOInput!, $offset: Int, $size: Int, $cacheDuration: String) {
      data: extraction(type: { format: $formatLabel }, offset: $offset, size: $size, cacheDuration: $cacheDuration, filter: $filter)
    }
  `,
};

@Injectable({ providedIn: 'root' })
export class ActivityCalendarProgressReportService extends BaseGraphqlService {
  constructor(protected graphql: GraphqlService) {
    super(graphql);
  }

  protected readonly _logPrefix = '[activity-calendar-progress-report-service] ';

  async loadAll(
    filter: Partial<ExtractionFilter>,
    opts?: {
      formatLabel?: string;
      sheetNames?: string[];
      query?: any;
      dataTypes?: {
        AM: new () => ActivityMonitoring;
      };
      fetchPolicy?: FetchPolicy;
      cache?: boolean; // enable by default
      cacheDuration?: ExtractionCacheDurationType;
    }
  ): Promise<ActivityMonitoringExtractionData> {
    opts = {
      sheetNames: ['AM'],
      dataTypes: {
        AM: ActivityMonitoring as unknown as new () => ActivityMonitoring,
      },
      ...opts,
    };
    const withCache = !opts || opts.cache !== false;
    const cacheDuration = withCache ? (opts && opts.cacheDuration) || 'default' : undefined;

    filter = ExtractionFilter.fromObject(filter);
    if (filter.isEmpty()) throw new Error('Cannot load months progress data: filter is empty!');

    const podFilter = filter.asPodObject();
    podFilter.sheetNames = opts?.sheetNames;
    delete podFilter.sheetName;

    const variables = {
      filter: podFilter,
      formatLabel: opts.formatLabel || 'ACTIMONIT',
      offset: 0,
      size: 10000, // All rows
      sortDirection: 'asc',
      cacheDuration,
    };

    const now = Date.now();
    console.debug(
      `${this._logPrefix}Loading extraction data... {cache: ${withCache}${withCache ? ", cacheDuration: '" + cacheDuration + "'" : ''}}`,
      variables
    );

    const query = opts?.query || Queries.extraction;
    const { data } = await this.graphql.query<{ data: ActivityMonitoringExtractionData }>({
      query,
      variables,
      fetchPolicy: (opts && opts.fetchPolicy) || 'no-cache',
    });

    const result = Object.keys(data).reduce(
      (map, sheetName) => {
        const jsonArray = data[sheetName];
        const dataType = opts?.dataTypes[sheetName];
        if (dataType) {
          const entities = (jsonArray || []).map((json) => {
            const entity = new dataType();
            entity.fromObject(json);
            return entity;
          });
          map[sheetName] = entities;
        } else {
          console.warn('Unknown dataType for sheetName: ' + sheetName);
          map[sheetName] = jsonArray; // Unknown data type
        }
        return map;
      },
      <ActivityMonitoringExtractionData>{}
    );

    console.debug(`${this._logPrefix}Extraction data loaded in ${Date.now() - now}ms`, result);

    return result;
  }
}
