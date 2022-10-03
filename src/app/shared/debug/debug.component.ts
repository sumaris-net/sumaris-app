import {Component, Input, OnInit, ViewChild} from '@angular/core';
import { environment } from '@environments/environment';
import {MatExpansionPanel} from '@angular/material/expansion';

@Component({
  selector: 'app-debug',
  templateUrl: './debug.component.html',
  styleUrls: ['./debug.component.scss']
})
export class DebugComponent {

  @Input() title: string = '';
  @Input() enable = !environment.production;
  @Input() expanded = false;

  @ViewChild('expansionPanel') expansionPanel: MatExpansionPanel

  constructor() { }

  toggle() {
    this.expansionPanel.toggle();
  }
}
