import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { APP_IMAGE_ATTACHMENT_SERVICE } from '@app/data/image/image-attachment.service';
import { EntityUtils, InMemoryEntitiesService } from '@sumaris-net/ngx-components';
import { ImageAttachment, ImageAttachmentFilter } from '@app/data/image/image-attachment.model';

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
  selector: 'app-gallery',
  styleUrls: ['./gallery.page.scss'],
  templateUrl: './gallery.page.html',
  imports: [CommonModule, IonicModule],
})
export class GalleryPage {
  isModalOpen = false;
  currentImage: string | null = null;
  analysisResult: FishResult | null = null;

  // Sample data for demonstration
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

  onCardClick(image: any) {
    this.currentImage = image.dataUrl;
    // Find a matching result or use the first one for demo purposes
    this.analysisResult = this.sampleResults.find((r) => r.species === image.title) || this.sampleResults[0];
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.currentImage = null;
    this.analysisResult = null;
  }
}
