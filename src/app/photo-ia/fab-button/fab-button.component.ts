import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Platform } from '@ionic/angular';
import { booleanAttribute } from '@angular/core';
import { isMobile } from '@sumaris-net/ngx-components';

@Component({
  selector: 'app-fab-button',
  templateUrl: './fab-button.component.html',
  styleUrls: ['./fab-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FabButtonComponent implements OnInit {
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) mobile: boolean = null;
  @Output() onImageSelected = new EventEmitter<File>();

  @ViewChild('fileInput') fileInput: ElementRef<HTMLInputElement>;
  @ViewChild('galleryInput') galleryInput: ElementRef<HTMLInputElement>;

  constructor(public platform: Platform) {}

  ngOnInit() {
    this.mobile = this.mobile ?? isMobile(window);
  }

  triggerCamera(): void {
    if (this.disabled) return;

    this.fileInput.nativeElement.setAttribute('capture', 'camera');
    this.fileInput.nativeElement.setAttribute('accept', 'image/*');
    this.fileInput.nativeElement.click();
  }

  triggerGallery(): void {
    if (this.disabled) return;

    this.galleryInput.nativeElement.removeAttribute('capture');
    this.galleryInput.nativeElement.setAttribute('accept', 'image/*');
    this.galleryInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.onImageSelected.emit(file);
      input.value = '';
    }
  }
}
