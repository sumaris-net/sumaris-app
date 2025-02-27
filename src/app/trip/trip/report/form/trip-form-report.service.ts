import { Injectable } from '@angular/core';
import { GraphqlService } from '@sumaris-net/ngx-components';
import { TripReportService } from '../trip-report.service';
import {
  FormExtractionData,
  TripFormReportDataSpeciesLength,
  TripFormReportDataSpeciesList,
  TripFormReportDataStation,
  TripFormReportData,
} from './trip-form-report.model';
import { ExtractionCacheDurationType, ExtractionFilter } from '@app/extraction/type/extraction-type.model';
import { FetchPolicy } from '@apollo/client/core';

@Injectable()
export class TripFormReportService extends TripReportService<
  FormExtractionData,
  TripFormReportData,
  TripFormReportDataStation,
  TripFormReportDataSpeciesList,
  TripFormReportDataSpeciesLength
> {
  constructor(protected graphql: GraphqlService) {
    super(graphql);
  }

  loadAll(
    filter: Partial<ExtractionFilter>,
    opts?: {
      fetchPolicy?: FetchPolicy;
      cache?: boolean; // enable by default
      cacheDuration?: ExtractionCacheDurationType;
    }
  ): Promise<FormExtractionData> {
    return super.loadAll(filter, {
      ...opts,
      sheetNames: ['TR', 'HH'],
      dataTypes: {
        TR: TripFormReportData,
        HH: TripFormReportDataStation,
        SL: TripFormReportDataSpeciesList,
        HL: TripFormReportDataSpeciesLength,
      },
    });
  }
}
