import { booleanAttribute, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AppColors, MatAutocompleteFieldConfig } from '@sumaris-net/ngx-components';
import { Trip } from '@app/trip/trip/trip.model';

@Component({
  selector: 'app-trip-card',
  templateUrl: './trip-card.component.html',
  styleUrls: ['./trip-card.component.scss'],
})
export class TripCardComponent implements OnInit {
  @Input() value: Trip;
  @Input() color: AppColors = 'light';
  @Input() config: {
    [key: string]: MatAutocompleteFieldConfig;
  } = {};
  @Input({ transform: booleanAttribute }) showRecorder = true;
  @Input({ transform: booleanAttribute }) showRecorderDepartment = true;
  @Input({ transform: booleanAttribute }) showProgram = true;
  @Input({ transform: booleanAttribute }) showComments = false;
  @Input({ transform: booleanAttribute }) showUpdateDate = false;

  @Output() delete = new EventEmitter<Event>();
  @Output() synchronize = new EventEmitter<Event>();

  constructor() {}

  ngOnInit() {}
}
