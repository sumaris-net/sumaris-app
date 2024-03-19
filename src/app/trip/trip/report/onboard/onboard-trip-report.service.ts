import { Injectable } from '@angular/core';
import { GraphqlService } from '@sumaris-net/ngx-components';
import { TripReportService } from '../trip-report.service';
import { OnboardExtractionData, OnboardSpeciesLength, OnboardSpeciesList, OnboardStation, OnboardTrip } from './onboard-trip-report.model';
import { SelectivityExtractionData } from '../selectivity/selectivity-trip-report.model';
import { ExtractionCacheDurationType, ExtractionFilter } from '@app/extraction/type/extraction-type.model';
import { FetchPolicy } from '@apollo/client/core';

@Injectable()
export class OnboardTripReportService extends TripReportService<
  OnboardExtractionData,
  OnboardTrip,
  OnboardStation,
  OnboardSpeciesList,
  OnboardSpeciesLength
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
  ): Promise<OnboardExtractionData> {
    return super.loadAll(filter, {
      ...opts,
      sheetNames: ['TR', 'HH'],
      dataTypes: {
        TR: OnboardTrip,
        HH: OnboardStation,
        SL: OnboardSpeciesList,
        HL: OnboardSpeciesLength,
      },
    });
  }
}
