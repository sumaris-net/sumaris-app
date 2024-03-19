import { RdbExtractionData, RdbPmfmSpeciesLength, RdbPmfmSpeciesList, RdbPmfmStation, RdbPmfmTrip } from '../trip-report.model';

export interface OnboardExtractionData<
  TR extends OnboardTrip = OnboardTrip,
  HH extends OnboardStation = OnboardStation,
  SL extends OnboardSpeciesList = OnboardSpeciesList,
  HL extends OnboardSpeciesLength = OnboardSpeciesLength,
> extends RdbExtractionData<TR, HH, SL, HL> {}

export class OnboardTrip extends RdbPmfmTrip<OnboardTrip> {}

export class OnboardStation extends RdbPmfmStation<OnboardStation> {}

export class OnboardSpeciesList extends RdbPmfmSpeciesList<OnboardSpeciesList> {}

export class OnboardSpeciesLength extends RdbPmfmSpeciesLength<OnboardSpeciesLength> {}
