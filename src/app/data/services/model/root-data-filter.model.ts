import { RootDataEntity } from './root-data-entity.model';
import {
  EntityAsObjectOptions,
  EntityUtils,
  FilterFn,
  fromDateISOString,
  isNil,
  isNotNil,
  isNotNilOrBlank,
  Person,
  ReferentialRef,
  ReferentialUtils,
  toDateISOString
} from '@sumaris-net/ngx-components';
import { DataEntityFilter } from './data-filter.model';
import { Moment } from 'moment';
import { SynchronizationStatus } from '@app/data/services/model/model.utils';
import { NOT_MINIFY_OPTIONS } from '@app/core/services/model/referential.utils';

export abstract class RootDataEntityFilter<
  T extends RootDataEntityFilter<T, E, EID, AS, FO>,
  E extends RootDataEntity<E, EID> = RootDataEntity<any, any>,
  EID = number,
  AS extends EntityAsObjectOptions = EntityAsObjectOptions,
  FO = any>
  extends DataEntityFilter<T, E, EID, AS, FO> {

  program: ReferentialRef;
  synchronizationStatus: SynchronizationStatus;
  recorderPerson: Person;
  startDate?: Moment;
  endDate?: Moment;

  fromObject(source: any, opts?: any) {
    super.fromObject(source, opts);
    this.synchronizationStatus = source.synchronizationStatus || undefined;
    this.program = ReferentialRef.fromObject(source.program) ||
      isNotNilOrBlank(source.programLabel) && ReferentialRef.fromObject({label: source.programLabel}) || undefined;
    this.recorderPerson = Person.fromObject(source.recorderPerson)
      || isNotNil(source.recorderPersonId) && Person.fromObject({id: source.recorderPersonId}) || undefined;
    this.startDate = fromDateISOString(source.startDate);
    this.endDate = fromDateISOString(source.endDate);
  }

  asObject(opts?: AS): any {
    const target = super.asObject(opts);
    target.startDate = toDateISOString(this.startDate);
    target.endDate = toDateISOString(this.endDate);
    if (opts && opts.minify) {
      target.programLabel = this.program && this.program.label || undefined;
      delete target.program;

      target.recorderPersonId = this.recorderPerson && this.recorderPerson.id || undefined;
      delete target.recorderPerson;

      // Not exits in pod
      delete target.synchronizationStatus;
    }
    else {
      target.program = this.program && this.program.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
      target.recorderPerson = this.recorderPerson && this.recorderPerson.asObject({...opts, ...NOT_MINIFY_OPTIONS}) || undefined;
      target.synchronizationStatus = this.synchronizationStatus;
    }

    return target;
  }

  buildFilter(opts = {skipProgram: false}): FilterFn<E>[] {
    const filterFns = super.buildFilter();

    // Program
    if (this.program && !opts.skipProgram) {
      const programId = this.program.id;
      const programLabel = this.program.label;
      if (isNotNil(programId)) {
        filterFns.push(t => (t.program && t.program.id === programId));
      }
      else if (isNotNilOrBlank(programLabel)) {
        filterFns.push(t => (t.program && t.program.label === programLabel));
      }
    }

    // Recorder person
    if (ReferentialUtils.isNotEmpty(this.recorderPerson)) {
      const recorderPersonId = this.recorderPerson.id;
      filterFns.push(t => (t.recorderPerson && t.recorderPerson.id === recorderPersonId));
    }

    // Synchronization status
    if (this.synchronizationStatus) {
      if (this.synchronizationStatus === 'SYNC') {
        filterFns.push(EntityUtils.isRemote);
      }
      else {
        const synchronizationStatus = this.dataQualityStatus === 'CONTROLLED' ? 'READY_TO_SYNC' : undefined;
        filterFns.push(t => EntityUtils.isLocal(t) && (!synchronizationStatus || t.synchronizationStatus === synchronizationStatus));
      }
    }

    // Quality status (only validated status : other case has been processed in the super class)
    if (this.dataQualityStatus === 'VALIDATED'){
        filterFns.push(t => isNil(t.validationDate));
    }

    return filterFns;
  }
}
