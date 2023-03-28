import { Injectable } from '@angular/core';
import { GraphqlService } from '@sumaris-net/ngx-components';
import { FetchPolicy } from '@apollo/client/core';
import { ExtractionCacheDurationType } from '@app/extraction/type/extraction-type.model';
import { TripFilter } from '@app/trip/services/filter/trip.filter';
import { TripReportData, TripReportService } from '@app/trip/trip/report/trip-report.service';
import { SelectivitySpeciesLength, SelectivitySpeciesList, SelectivityStation } from './selectivity-trip-report.model';


export interface SelectivityReportData<
  HH extends SelectivityStation = SelectivityStation,
  SL extends SelectivitySpeciesList = SelectivitySpeciesList,
  HL extends SelectivitySpeciesLength = SelectivitySpeciesLength
> extends TripReportData<HH, SL, HL> {
}

@Injectable()
export class SelectivityTripReportService extends TripReportService<SelectivityReportData, SelectivityStation, SelectivitySpeciesList, SelectivitySpeciesLength> {

  constructor(
    protected graphql: GraphqlService
  ) {
    super(graphql);
  }

  loadData(filter: Partial<TripFilter>,
           opts?: {
             fetchPolicy?: FetchPolicy;
             cache?: boolean; // enable by default
             cacheDuration?: ExtractionCacheDurationType;
           }): Promise<SelectivityReportData> {
    return super.loadData(filter, {
      ...opts,
      formatLabel: 'apase',
      dataTypes: {
        HH: SelectivityStation,
        SL: SelectivitySpeciesList,
        HL: SelectivitySpeciesLength
      }
    })
  }

}
