import { DateUtils, Entity, fromDateISOString, ReferentialRef, toNumber } from '@sumaris-net/ngx-components';
import { Operation, Trip } from '@app/trip/trip/trip.model';
import { VesselPosition } from '@app/data/position/vessel/vessel-position.model';
import { VesselSnapshot } from '@app/referential/services/model/vessel-snapshot.model';
export class RdbTrip extends Entity {
    clone(opts) {
        return super.clone(opts);
    }
    fromObject(source) {
        this.tripCode = toNumber(source.tripCode);
        this.project = source.project;
        this.vesselIdentifier = toNumber(source.vesselIdentifier);
        this.vesselLength = toNumber(source.vesselLength);
        this.vesselSize = toNumber(source.vesselSize);
    }
    asTrip() {
        const target = new Trip();
        target.id = this.tripCode;
        target.program = ReferentialRef.fromObject({ label: this.project });
        target.vesselSnapshot = VesselSnapshot.fromObject({ id: this.vesselIdentifier, lengthOverAll: this.vesselLength, grossTonnageGt: this.vesselSize });
        return target;
    }
}
export class RdbStation extends Entity {
    fromObject(source) {
        this.tripCode = +source.tripCode;
        this.stationNumber = toNumber(source.stationNumber);
        this.date = source.date;
        this.time = source.time;
        this.fishingTime = toNumber(source.fishingTime, source.fishingDuration);
        this.posStartLat = +source.posStartLat;
        this.posStartLon = +source.posStartLon;
        this.posEndLat = +source.posEndLat;
        this.posEndLon = +source.posEndLon;
    }
    asOperation() {
        const target = new Operation();
        target.id = this.stationNumber;
        target.tripId = this.tripCode;
        target.startDateTime = fromDateISOString(`${this.date}T${this.time}:00.000Z`);
        target.fishingStartDateTime = target.startDateTime;
        target.endDateTime = fromDateISOString(target.fishingStartDateTime.clone().add(this.fishingTime, 'minutes'));
        target.fishingEndDateTime = target.endDateTime;
        target.startPosition = VesselPosition.fromObject({ latitude: this.posStartLat, longitude: this.posStartLon, dateTime: target.fishingStartDateTime, operationId: target.id });
        target.endPosition = VesselPosition.fromObject({ latitude: this.posEndLat, longitude: this.posEndLon, dateTime: target.fishingEndDateTime, operationId: target.id });
        target.positions = [target.startPosition, target.endPosition];
        return target;
    }
}
export class RdbSpeciesList extends Entity {
    fromObject(source) {
        this.tripCode = toNumber(source.tripCode);
        this.stationNumber = toNumber(source.stationNumber);
        this.species = source.species;
        this.catchCategory = source.catchCategory;
        this.weight = toNumber(source.weight);
        this.subsampleWeight = toNumber(source.subsampleWeight);
        this.lengthCode = source.lengthCode;
    }
    get isLanding() {
        return this.catchCategory === 'LAN';
    }
    get isDiscard() {
        return this.catchCategory === 'DIS';
    }
}
export class RdbSpeciesLength extends Entity {
    fromObject(source) {
        this.stationNumber = toNumber(source.stationNumber);
        this.species = source.species;
        this.catchCategory = source.catchCategory;
        this.lengthClass = toNumber(source.lengthClass);
        this.numberAtLength = toNumber(source.numberAtLength);
    }
}
export class RdbPmfmTrip extends RdbTrip {
    fromObject(source) {
        super.fromObject(source);
        this.departureDateTime = source.departureDateTime;
        this.returnDateTime = source.returnDateTime;
    }
    asTrip() {
        const target = super.asTrip();
        target.departureDateTime = DateUtils.moment(this.departureDateTime, 'YYYY-MM-DD HH:mm:ss.SSSZ');
        target.returnDateTime = DateUtils.moment(this.returnDateTime, 'YYYY-MM-DD HH:mm:ss.SSSZ');
        return target;
    }
}
export class RdbPmfmStation extends RdbStation {
}
export class RdbPmfmSpeciesList extends RdbSpeciesList {
}
export class RdbPmfmSpeciesLength extends RdbSpeciesLength {
    fromObject(source) {
        super.fromObject(source);
        this.elevatedNumberAtLength = toNumber(source.elevatedNumberAtLength);
        this.taxonGroupId = toNumber(source.taxonGroupId);
        this.referenceTaxonId = toNumber(source.referenceTaxonId);
    }
}
//# sourceMappingURL=trip-report.model.js.map