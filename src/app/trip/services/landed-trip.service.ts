import {Injectable, Injector, Optional} from '@angular/core';
import {EntitiesStorage, FormErrors, FormErrorTranslator, GraphqlService, LocalSettingsService, NetworkService, PersonService, UserEventService,} from '@sumaris-net/ngx-components';
import {OperationService} from './operation.service';
import {VesselSnapshotService} from '@app/referential/services/vessel-snapshot.service';
import {ReferentialRefService} from '@app/referential/services/referential-ref.service';
import {TripValidatorOptions, TripValidatorService} from './validator/trip.validator';
import {Trip} from './model/trip.model';
import {TranslateService} from '@ngx-translate/core';
import {ToastController} from '@ionic/angular';
import {TrashRemoteService} from '@app/core/services/trash-remote.service';
import {PhysicalGearService} from '@app/trip/services/physicalgear.service';
import {TripService} from '@app/trip/services/trip.service';

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
    protected userEventService: UserEventService,
    protected trashRemoteService: TrashRemoteService,
    protected formErrorTranslator: FormErrorTranslator,
    @Optional() protected translate: TranslateService,
    @Optional() protected toastController: ToastController
  ) {
    super(injector, graphql, network, referentialRefService, vesselSnapshotService, personService, entities, operationService, physicalGearService, settings, validatorService,
      userEventService, trashRemoteService, formErrorTranslator, translate, toastController);
  }

  /**
   * Control the validity of an trip
   *
   * @param entity
   * @param opts
   */
  async control(entity: Trip, opts?: TripValidatorOptions): Promise<FormErrors> {
    console.debug('[landed-trip-service] Start Control trip');
    return super.control(entity, {...opts, withOperationGroup: true});
  }
}
