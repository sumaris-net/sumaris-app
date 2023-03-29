import { Injectable } from '@angular/core';
import { GraphqlService } from '@sumaris-net/ngx-components';
import { FetchPolicy } from '@apollo/client/core';
import { ExtractionCacheDurationType, ExtractionFilter } from '@app/extraction/type/extraction-type.model';
import { TripFilter } from '@app/trip/services/filter/trip.filter';
import { RdbData, TripReportService } from '@app/trip/trip/report/trip-report.service';
import { SelectivityGear, SelectivitySpeciesLength, SelectivitySpeciesList, SelectivityStation, SelectivityTrip } from './selectivity-trip-report.model';


export interface SelectivityData<
  TR extends SelectivityTrip = SelectivityTrip,
  FG extends SelectivityGear = SelectivityGear,
  HH extends SelectivityStation = SelectivityStation,
  SL extends SelectivitySpeciesList = SelectivitySpeciesList,
  HL extends SelectivitySpeciesLength = SelectivitySpeciesLength
> extends RdbData<TR, HH, SL, HL> {
  FG: FG[];
}

@Injectable()
export class SelectivityTripReportService extends TripReportService<SelectivityData, SelectivityTrip, SelectivityStation, SelectivitySpeciesList, SelectivitySpeciesLength> {

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
           }): Promise<SelectivityData> {
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
