import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { CanLeave, ImageAttachment, ImageAttachmentFilter, InMemoryEntitiesService } from '@sumaris-net/ngx-components';
import { APP_IMAGE_ATTACHMENT_SERVICE } from '@app/data/image/image-attachment.service';

interface FishResult {
  species: string;
  confidence: number;
  details: {
    family: string;
    habitat: string;
    size: string;
  };
}

@Component({
  selector: 'app-capture',
  templateUrl: './photo.page.html',
  styleUrls: ['./photo.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotoPage implements OnInit, CanLeave {
  mobile: boolean;
  hasImage: boolean = false;
  isAnalyzing: boolean = false;
  isModalOpen: boolean = false;
  currentImage: string | null = null;
  analysisResult: FishResult | null = null;
  private analysisTimeout: any;
  dirty: boolean = false;
  valid: boolean;

  private currentResultIndex = 0;
  private readonly sampleResults: FishResult[] = [
    {
      species: 'Bar commun',
      confidence: 95.7,
      details: {
        family: 'Moronidae',
        habitat: 'Eaux côtières et estuaires',
        size: '30-100 cm',
      },
    },
    {
      species: 'Truite arc-en-ciel',
      confidence: 88.2,
      details: {
        family: 'Salmonidae',
        habitat: "Rivières et lacs d'eau douce",
        size: '25-70 cm',
      },
    },
    {
      species: 'Thon rouge',
      confidence: 92.4,
      details: {
        family: 'Scombridae',
        habitat: 'Eaux océaniques profondes',
        size: '200-400 cm',
      },
    },
  ];

  constructor(
    private platform: Platform,
    private cd: ChangeDetectorRef,
    @Inject(APP_IMAGE_ATTACHMENT_SERVICE) protected dataService: InMemoryEntitiesService<ImageAttachment, ImageAttachmentFilter>
  ) {}

  async cancel(event?: Event): Promise<void> {
    if (event) {
      event.preventDefault();
    }

    this.isModalOpen = false;
    this.clearAnalysis();
    this.hasImage = false;
    this.currentImage = null;
    this.analysisResult = null;
    this.dirty = false;
  }

  save(): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  ngOnInit(): void {
    this.mobile = this.platform.is('mobile') || this.platform.is('mobileweb');
  }

  handleImageUpload(file: File): void {
    try {
      this.clearAnalysis();

      this.isAnalyzing = true;
      this.currentImage = URL.createObjectURL(file);
      this.hasImage = true;
      this.dirty = true;

      // Simuler l'analyse
      this.analysisTimeout = setTimeout(() => {
        try {
          this.analysisResult = this.sampleResults[this.currentResultIndex];
          this.currentResultIndex = (this.currentResultIndex + 1) % this.sampleResults.length;

          this.isAnalyzing = false;
          this.isModalOpen = true;
          this.dataService.value = [
            ...this.dataService.value,
            ImageAttachment.fromObject({
              dataUrl: this.currentImage,
              title: this.analysisResult.species,
            }),
          ];

          this.cd.markForCheck();
        } catch (error) {
          console.error('Error during analysis:', error);
          this.handleAnalysisError();
        }
      }, 2000);

      setTimeout(() => {
        if (this.isAnalyzing) {
          this.handleAnalysisError();
        }
      }, 10000);
    } catch (error) {
      console.error('Error handling image upload:', error);
      this.handleAnalysisError();
    }
  }

  private handleAnalysisError(): void {
    this.isAnalyzing = false;
    this.analysisResult = null;
    this.dirty = false;
  }

  private clearAnalysis(): void {
    if (this.analysisTimeout) {
      clearTimeout(this.analysisTimeout);
    }
    if (this.currentImage) {
      URL.revokeObjectURL(this.currentImage);
    }
    this.isAnalyzing = false;
    this.analysisResult = null;
    this.dirty = false;
  }

  closeModal() {
    this.isModalOpen = false;
    this.hasImage = false;
    this.currentImage = null;
    this.analysisResult = null;
    this.dirty = false;
  }

  ngOnDestroy(): void {
    this.clearAnalysis();
  }
}
