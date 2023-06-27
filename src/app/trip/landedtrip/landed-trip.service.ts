import { Injectable, Injector, Optional } from '@angular/core';
import { EntitiesStorage, FormErrors, FormErrorTranslator, GraphqlService, LocalSettingsService, NetworkService, PersonService } from '@sumaris-net/ngx-components';
import { OperationService } from '../operation/operation.service';
import { VesselSnapshotService } from '@app/referential/services/vessel-snapshot.service';
import { ReferentialRefService } from '@app/referential/services/referential-ref.service';
import { TripValidatorOptions, TripValidatorService } from '../trip/trip.validator';
import { Trip } from '../trip/trip.model';
import { TranslateService } from '@ngx-translate/core';
import { ToastController } from '@ionic/angular';
import { TrashRemoteService } from '@app/core/services/trash-remote.service';
import { PhysicalGearService } from '@app/trip/physicalgear/physicalgear.service';
import { TripService } from '@app/trip/trip/trip.service';
import { UserEventService } from '@app/social/user-event/user-event.service';

@Injectable({providedIn: 'root'})
export class LandedTripService
  extends TripService {


  constructor(
    injector: Injector,
    protected graphql: GraphqlService,
    protected network: NetworkService,
    protected referentialRefService: ReferentialRefService,
    protected vesselSnapshotService: VesselSnapshotService,
    protected personService: PersonService,
    protected entities: EntitiesStorage,
    protected operationService: OperationService,
    protected physicalGearService: PhysicalGearService,
    protected settings: LocalSettingsService,
    protected validatorService: TripValidatorService,
    protected trashRemoteService: TrashRemoteService,
    protected formErrorTranslator: FormErrorTranslator,
    protected userEventService: UserEventService,
    @Optional() protected translate: TranslateService,
    @Optional() protected toastController: ToastController
  ) {
    super(injector, graphql, network, referentialRefService, vesselSnapshotService, personService,
      entities, operationService, physicalGearService, settings, validatorService,
      trashRemoteService, formErrorTranslator, userEventService, translate, toastController);
  }
}
