import { IReportData } from '@app/data/report/base-report.class';
import { DataQualityStatusIdType } from '@app/data/services/model/model.utils';
import { Entity, EntityAsObjectOptions } from '@sumaris-net/ngx-components';
import { sourceMapsEnabled } from 'process';

export type ActivityMonitoringStatus = 'EMPTY' | 'COMPLETE' | 'INCOMPLETE';

export const ActivityMonitoringStatusEnum = Object.freeze({
  EMPTY: <ActivityMonitoringStatus>'EMPTY',
  COMPLETE: <ActivityMonitoringStatus>'COMPLETE',
  INCOMPLETE: <ActivityMonitoringStatus>'INCOMPLETE',
});

export type ActivityMonitoringStatusError =
  | 'REQUIRED_PORT'
  | 'TOO_MANY_METIER'
  | 'REQUIRED_METIER'
  | 'REQUIRED_FISHING_AREA'
  | 'REQUIRED_DISTANCE_TO_COAST_GRADIENT';

export const ActivityMonitoringStatusErrorIds: { [K in ActivityMonitoringStatusError]: number } = Object.freeze({
  REQUIRED_PORT: 1,
  REQUIRED_METIER: 2,
  REQUIRED_FISHING_AREA: 3,
  REQUIRED_DISTANCE_TO_COAST_GRADIENT: 4,
  TOO_MANY_METIER: 5,
});

export class ActivityMonitoringExtractionData implements IReportData {
  AC: Calendar[];
  AM: ActivityMonitoring[];

  fromObject(source: any) {
    this.AC = source?.AC?.map((value: any) => Calendar.fromObject(value)) || [];
    this.AM = source?.AM?.map((value: any) => ActivityMonitoring.fromObject(value)) || [];
  }

  asObject(opts?: EntityAsObjectOptions): any {
    return {
      AC: this.AC.map((value) => value.asObject(opts)),
      AM: this.AM.map((value) => value.asObject(opts)),
    };
  }
}

export class Calendar extends Entity<Calendar> {
  vesselName: string;
  vesselLength: string;
  registrationLocationLabel: string;
  vesselRegistrationCode: string;
  vesselIntRegistrationCode: string;
  observerName: string;
  surveyQualification: string;
  emptyMonthCount: number;
  errorMonthCount: number;
  recorderPerson: string;
  recorderDepartment: string;
  status: ActivityMonitoringStatus;
  qualityStatus: DataQualityStatusIdType;
  directSurveyInvestigation: string;
  economicSurvey: string;
  meta?: {
    [key: string]: any;
  };

  static fromObject: (source: any, opts?: any) => Calendar;

  fromObject(source: any, opts?: any): void {
    this.vesselName = source.vesselName?.replace(' | ', ', ');
    this.vesselLength = source.vesselLength;
    this.registrationLocationLabel = source.registrationLocationLabel?.replace('|', ', ');
    this.vesselRegistrationCode = source.vesselRegistrationCode?.replace('|', ', ');
    this.vesselIntRegistrationCode = source.vesselIntRegistrationCode?.replace('|', ', ');
    this.observerName = source.observerName;
    this.surveyQualification = source.surveyQualification;
    this.recorderPerson = source.recorderPerson;
    this.emptyMonthCount = source.emptyMonthCount;
    this.errorMonthCount = source.errorMonthCount;
    this.directSurveyInvestigation = source.directSurveyInvestigation;
    this.economicSurvey = source.economicSurvey;
    this.status = source.status;
    this.qualityStatus = source.qualityStatus;
  }
}

export class ActivityMonitoring extends Entity<ActivityMonitoring> {
  vesselName: string;
  vesselLength: string;
  registrationLocationLabel: string;
  vesselRegistrationCode: string;
  vesselIntRegistrationCode: string;
  observerName: string;
  emptyMonthCount: number;
  errorMonthCount: number;
  recorderPerson: string;
  recorderDepartment: string;
  surveyQualification: string;
  status: ActivityMonitoringStatus;
  qualityStatus: DataQualityStatusIdType;
  directSurveyInvestigation: string;
  economicSurvey: string;
  month1: number;
  month2: number;
  month3: number;
  month4: number;
  month5: number;
  month6: number;
  month7: number;
  month8: number;
  month9: number;
  month10: number;
  month11: number;
  month12: number;
  month1Error: string;
  month2Error: string;
  month3Error: string;
  month4Error: string;
  month5Error: string;
  month6Error: string;
  month7Error: string;
  month8Error: string;
  month9Error: string;
  month10Error: string;
  month11Error: string;
  month12Error: string;
  meta?: {
    [key: string]: any;
  };

  static fromObject: (source: any, opts?: any) => ActivityMonitoring;

  fromObject(source: any, opts?: any): void {
    this.vesselName = source.vesselName?.replace(' | ', ', ');
    this.vesselLength = source.vesselLength;
    this.registrationLocationLabel = source.registrationLocationLabel?.replace('|', ', ');
    this.vesselRegistrationCode = source.vesselRegistrationCode?.replace('|', ', ');
    this.vesselIntRegistrationCode = source.vesselIntRegistrationCode?.replace('|', ', ');
    this.observerName = source.observerName;
    this.recorderPerson = source.recorderPerson;
    this.surveyQualification = source.surveyQualification;
    this.emptyMonthCount = source.emptyMonthCount;
    this.errorMonthCount = source.errorMonthCount;
    this.directSurveyInvestigation = source.directSurveyInvestigation;
    this.economicSurvey = source.economicSurvey;
    this.status = source.status;
    this.qualityStatus = source.qualityStatus;
    this.month1 = source.month1;
    this.month2 = source.month2;
    this.month3 = source.month3;
    this.month4 = source.month4;
    this.month5 = source.month5;
    this.month6 = source.month6;
    this.month7 = source.month7;
    this.month8 = source.month8;
    this.month9 = source.month9;
    this.month10 = source.month10;
    this.month11 = source.month11;
    this.month12 = source.month12;
    this.month1Error = source.month1Error;
    this.month2Error = source.month2Error;
    this.month3Error = source.month3Error;
    this.month4Error = source.month4Error;
    this.month5Error = source.month5Error;
    this.month6Error = source.month6Error;
    this.month7Error = source.month7Error;
    this.month8Error = source.month8Error;
    this.month9Error = source.month9Error;
    this.month10Error = source.month10Error;
    this.month11Error = source.month11Error;
    this.month12Error = source.month12Error;
  }
}
