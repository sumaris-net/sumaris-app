import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { RxState } from '@rx-angular/state';
import { Platform } from '@ionic/angular';
import { Ichthyometer, IchthyometerService } from '@app/shared/ichthyometer/ichthyometer.service';
import { isNotEmptyArray } from '@sumaris-net/ngx-components';
import { filter, switchMap } from 'rxjs/operators';

interface IchthyometerTestingState {
  loading: boolean;
  enabled: boolean;
  connectedDevices: Ichthyometer[];
  values: string[]; // Read values
}

@Component({
  selector: 'app-ichthyometer-testing',
  templateUrl: './ichthyometer.testing.html',
  styleUrls: [
    './ichthyometer.testing.scss'
  ],
  providers: [RxState],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IchthyometerTestingPage {

  readonly loading$ = this._state.select('loading');
  readonly enabled$ = this._state.select('enabled');
  readonly connectedDevices$ = this._state.select('connectedDevices');
  readonly values$ = this._state.select('values');

  get connectedDevices(): Ichthyometer[] {
    return this._state.get('connectedDevices');
  }

  get isConnected(): boolean {
    return isNotEmptyArray(this.connectedDevices);
  }

  constructor(
    protected platform: Platform,
    protected ichthyometerService: IchthyometerService,
    private cd: ChangeDetectorRef,
    private _state: RxState<IchthyometerTestingState>
  ) {

    this._state.set({
      loading: false,
      values: []
    });
    this._state.connect('enabled', this.ichthyometerService.enabled$);
    this._state.connect('connectedDevices', this.ichthyometerService.connectedDevices$);
    this._state.connect('values', this.ichthyometerService.watch(),
      (s, value)  => ([...(s.values || []), value]));
  }

  async disconnectAll() {
    await this.ichthyometerService.disconnectAll();
  }

  async disconnect(item: Ichthyometer) {
    await this.ichthyometerService.disconnect(item);
  }
}
