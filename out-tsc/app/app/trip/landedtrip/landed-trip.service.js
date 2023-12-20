import { __decorate, __metadata, __param } from "tslib";
import { Injectable, Injector, Optional } from '@angular/core';
import { EntitiesStorage, FormErrorTranslator, GraphqlService, LocalSettingsService, NetworkService, PersonService } from '@sumaris-net/ngx-components';
import { OperationService } from '../operation/operation.service';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { TripValidatorService } from '../trip/trip.validator';
import { TranslateService } from '@ngx-translate/core';
import { ToastController } from '@ionic/angular';
import { TrashRemoteService } from '@app/core/services/trash-remote.service';
import { PhysicalGearService } from '@app/trip/physicalgear/physicalgear.service';
import { TripService } from '@app/trip/trip/trip.service';
import { UserEventService } from '@app/social/user-event/user-event.service';
let LandedTripService = class LandedTripService extends TripService {
    constructor(injector, graphql, network, referentialRefService, vesselSnapshotService, personService, entities, operationService, physicalGearService, settings, validatorService, trashRemoteService, formErrorTranslator, userEventService, translate, toastController) {
        super(injector, graphql, network, referentialRefService, vesselSnapshotService, personService, entities, operationService, physicalGearService, settings, validatorService, trashRemoteService, formErrorTranslator, userEventService, translate, toastController);
        this.graphql = graphql;
        this.network = network;
        this.referentialRefService = referentialRefService;
        this.vesselSnapshotService = vesselSnapshotService;
        this.personService = personService;
        this.entities = entities;
        this.operationService = operationService;
        this.physicalGearService = physicalGearService;
        this.settings = settings;
        this.validatorService = validatorService;
        this.trashRemoteService = trashRemoteService;
        this.formErrorTranslator = formErrorTranslator;
        this.userEventService = userEventService;
        this.translate = translate;
        this.toastController = toastController;
    }
};
LandedTripService = __decorate([
    Injectable({ providedIn: 'root' }),
    __param(14, Optional()),
    __param(15, Optional()),
    __metadata("design:paramtypes", [Injector,
        GraphqlService,
        NetworkService,
        ReferentialRefService,
        VesselSnapshotService,
        PersonService,
        EntitiesStorage,
        OperationService,
        PhysicalGearService,
        LocalSettingsService,
        TripValidatorService,
        TrashRemoteService,
        FormErrorTranslator,
        UserEventService,
        TranslateService,
        ToastController])
], LandedTripService);
export { LandedTripService };
//# sourceMappingURL=landed-trip.service.js.map