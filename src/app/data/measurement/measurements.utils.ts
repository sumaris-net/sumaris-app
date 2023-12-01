import { IPmfm } from '@app/referential/services/model/pmfm.model';

export interface MeasurementsFormState {
  ready: boolean;
  readyStep: number;
  programLabel: string;
  acquisitionLevel: string;
  strategyId: number;
  strategyLabel: string;
  requiredStrategy: boolean;
  gearId: number;
  requiredGear: boolean;
  forceOptional: boolean;
  pmfms: IPmfm[]; // All pmfms used to initialize the formGroup (visible or not)
}

export const MeasurementsFormReadySteps = Object.freeze({
  STARTING: 0, // initial state
  LOADING_PMFMS: 1,
  SETTING_PMFMS: 2,
  UPDATING_FORM_GROUP: 3,
  FORM_GROUP_READY: 4, // OK, the form is ready
});
