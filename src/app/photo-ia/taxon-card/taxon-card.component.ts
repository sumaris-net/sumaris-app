import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-taxon-card',
  templateUrl: './taxon-card.component.html',
  styleUrls: ['./taxon-card.component.scss'],
  imports: [CommonModule, IonicModule],
})
export class TaxonCardComponent {
  @Input() imageUrl: string;
  @Input() species: string;
  @Input() confidence: number;
  @Input() details: {
    family?: string;
    habitat?: string;
    size?: string;
  };
  @Input() showIcons = false;
  @Input() isLoading = false;

  menuOpen = false;

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }
}
