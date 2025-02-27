import { RdbExtractionData, RdbPmfmSpeciesLength, RdbPmfmSpeciesList, RdbPmfmStation, RdbPmfmTrip } from '../trip-report.model';

export interface FormExtractionData<
  TR extends TripFormReportData = TripFormReportData,
  HH extends TripFormReportDataStation = TripFormReportDataStation,
  SL extends TripFormReportDataSpeciesList = TripFormReportDataSpeciesList,
  HL extends TripFormReportDataSpeciesLength = TripFormReportDataSpeciesLength,
> extends RdbExtractionData<TR, HH, SL, HL> {}

export class TripFormReportData extends RdbPmfmTrip<TripFormReportData> {}

export class TripFormReportDataStation extends RdbPmfmStation<TripFormReportDataStation> {}

export class TripFormReportDataSpeciesList extends RdbPmfmSpeciesList<TripFormReportDataSpeciesList> {}

export class TripFormReportDataSpeciesLength extends RdbPmfmSpeciesLength<TripFormReportDataSpeciesLength> {}
