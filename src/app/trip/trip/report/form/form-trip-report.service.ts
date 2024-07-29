import { Injectable } from '@angular/core';
import { GraphqlService } from '@sumaris-net/ngx-components';
import { TripReportService } from '../trip-report.service';
import { FormExtractionData, FormSpeciesLength, FormSpeciesList, FormStation, FormTrip } from './form-trip-report.model';
import { ExtractionCacheDurationType, ExtractionFilter } from '@app/extraction/type/extraction-type.model';
import { FetchPolicy } from '@apollo/client/core';

@Injectable()
export class FormTripReportService extends TripReportService<FormExtractionData, FormTrip, FormStation, FormSpeciesList, FormSpeciesLength> {
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
        TR: FormTrip,
        HH: FormStation,
        SL: FormSpeciesList,
        HL: FormSpeciesLength,
      },
    });
  }
}
