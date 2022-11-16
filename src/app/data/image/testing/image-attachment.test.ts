import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { filter, mergeMap } from 'rxjs/operators';
import {
  EntitiesStorage,
  EntityUtils,
  firstNotNilPromise,
  isEmptyArray,
  isNil,
  isNotNilOrBlank,
  MatAutocompleteConfigHolder,
  SharedValidators,
  StatusIds,
  toNumber,
  waitFor
} from '@sumaris-net/ngx-components';
import { MatTabGroup } from '@angular/material/tabs';
import { TripService } from '@app/trip/services/trip.service';
import {AppImageAttachmentGallery} from '@app/data/image/image-attachment-gallery.component';


@Component({
  selector: 'app-image-attachment-test',
  templateUrl: './image-attachment.test.html',
  styleUrls: ['./image-attachment.test.scss']
})
export class ImageAttachmentTestPage implements OnInit {



  @ViewChild('mobileGallery') mobileGallery: AppImageAttachmentGallery;
  @ViewChild('tabGroup') tabGroup: MatTabGroup;


  constructor(
  ) {

  }

  ngOnInit() {

  }

  applyExample() {

  }
}

