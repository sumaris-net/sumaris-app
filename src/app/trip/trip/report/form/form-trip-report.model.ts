import { RdbExtractionData, RdbPmfmSpeciesLength, RdbPmfmSpeciesList, RdbPmfmStation, RdbPmfmTrip } from '../trip-report.model';

export interface FormExtractionData<
  TR extends FormTrip = FormTrip,
  HH extends FormStation = FormStation,
  SL extends FormSpeciesList = FormSpeciesList,
  HL extends FormSpeciesLength = FormSpeciesLength,
> extends RdbExtractionData<TR, HH, SL, HL> {}

export class FormTrip extends RdbPmfmTrip<FormTrip> {}

export class FormStation extends RdbPmfmStation<FormStation> {}

export class FormSpeciesList extends RdbPmfmSpeciesList<FormSpeciesList> {}

export class FormSpeciesLength extends RdbPmfmSpeciesLength<FormSpeciesLength> {}
