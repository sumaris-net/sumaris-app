import { ExpertiseArea, IExpertiseAreaProperties } from '@app/referential/expertise-area/expertise-area.model';
import { IPmfm } from '@app/referential/services/model/pmfm.model';
import { Program } from '@app/referential/services/model/program.model';

export interface AppDataState {
  programLabel: string;
  program: Program;
  pmfms: IPmfm[];
  availableExpertiseAreas: ExpertiseArea[];
  selectedExpertiseArea: ExpertiseArea;
  expertiseAreaProperties: IExpertiseAreaProperties;
}
