import { Injectable } from '@angular/core';
import { GraphqlService } from '@sumaris-net/ngx-components';
import { FetchPolicy } from '@apollo/client/core';
import { ExtractionCacheDurationType, ExtractionFilter } from '@app/extraction/type/extraction-type.model';
import { TripReportService } from '@app/trip/trip/report/trip-report.service';
import { SelectivityExtractionData, SelectivityGear, SelectivitySpeciesLength, SelectivitySpeciesList, SelectivityStation, SelectivityTrip } from './selectivity-trip-report.model';


@Injectable()
export class SelectivityTripReportService extends TripReportService<SelectivityExtractionData, SelectivityTrip, SelectivityStation, SelectivitySpeciesList, SelectivitySpeciesLength> {

  constructor(
    protected graphql: GraphqlService
  ) {
    super(graphql);
  }

  loadAll(filter: Partial<ExtractionFilter>,
          opts?: {
             fetchPolicy?: FetchPolicy;
             cache?: boolean; // enable by default
             cacheDuration?: ExtractionCacheDurationType;
           }): Promise<SelectivityExtractionData> {
    return super.loadAll(filter, {
      ...opts,
      formatLabel: 'apase',
      sheetNames: ['TR', 'HH', 'FG', 'SL', 'HL'],
      dataTypes: {
        TR: SelectivityTrip,
        FG: SelectivityGear,
        HH: SelectivityStation,
        SL: SelectivitySpeciesList,
        HL: SelectivitySpeciesLength
      }
    })
  }

}
