import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTabGroup } from '@angular/material/tabs';
import { AppImageAttachmentGallery } from '@app/data/image/image-attachment-gallery.component';


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

