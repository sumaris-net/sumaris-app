import {
    EntityAsObjectOptions,
    EntityClass,
    EntityFilter,
    FilterFn,
    fromDateISOString,
    isNotNil,
    toDateISOString
} from "@sumaris-net/ngx-components";
import {AggregatedLanding} from "@app/trip/aggregated-landing/aggregated-landing.model";
import {Moment} from "moment";
import {SynchronizationStatus} from "@app/data/services/model/model.utils";

@EntityClass({typename: 'AggregatedLandingFilterVO'})
export class AggregatedLandingFilter extends EntityFilter<AggregatedLandingFilter, AggregatedLanding> {

    static fromObject: (source: any, opts?: any) => AggregatedLandingFilter;

    programLabel?: string;
    startDate?: Moment;
    endDate?: Moment;
    locationId?: number;
    observedLocationId?: number;
    synchronizationStatus?: SynchronizationStatus;

    equals(f2: AggregatedLandingFilter): boolean {
        return isNotNil(f2)
            && this.programLabel === f2.programLabel
            && this.observedLocationId === f2.observedLocationId
            && this.locationId === f2.locationId
            && this.synchronizationStatus === f2.synchronizationStatus
            && ((!this.startDate && !f2.startDate) || (this.startDate.isSame(f2.startDate)))
            && ((!this.endDate && !f2.endDate) || (this.endDate.isSame(f2.endDate)));
    }

    fromObject(source: any) {
        super.fromObject(source);
        this.programLabel = source.programLabel;
        this.startDate = fromDateISOString(source.startDate);
        this.endDate = fromDateISOString(source.endDate);
        this.locationId = source.locationId;
        this.observedLocationId = source.observedLocationId;
        this.synchronizationStatus = source.synchronizationStatus;
    }

    asObject(opts?: EntityAsObjectOptions): any {
      const target = super.asObject(opts);
      target.startDate = this.startDate && toDateISOString(this.startDate);
      target.endDate = this.endDate && toDateISOString(this.endDate);
      if (opts && opts.minify) {
        delete target.id;
        delete target.synchronizationStatus;
      }
      return target;
    }

    protected buildFilter(): FilterFn<AggregatedLanding>[] {
        const filterFns = super.buildFilter();

        // FIXME: this properties cannot b filtered locally, because not exists !
        /*// Program
        if (isNotNilOrBlank(this.programLabel)) {
          const programLabel = this.programLabel;
          filterFns.push(t => (t.program && t.program.label === this.programLabel));
        }

        // Location
        if (isNotNil(this.locationId)) {
          filterFns.push((entity) => entity.location && entity.location.id === this.locationId);
        }

        // Start/end period
        if (this.startDate) {
          const startDate = this.startDate.clone();
          filterFns.push(t => t.dateTime && startDate.isSameOrBefore(t.dateTime));
        }
        if (this.endDate) {
          const endDate = this.endDate.clone().add(1, 'day').startOf('day');
          filterFns.push(t => t.dateTime && endDate.isAfter(t.dateTime));
        }*/

        // observedLocationId
        if (isNotNil(this.observedLocationId)) {
            filterFns.push((entity) => entity.observedLocationId === this.observedLocationId);
        }

        return filterFns;
    }

}
