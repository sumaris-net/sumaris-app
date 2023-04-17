import { Component } from '@angular/core';
import { BluetoothSerialService } from '@app/shared/bluetooth/bluetooth-serial.service';

@Component({
  selector: 'app-bluetooth-icon',
  templateUrl: './bluetooth-serial.component.html',
  styleUrls: [
    './bluetooth-serial.component.scss'
  ]
})
export class BluetoothSerialComponent {

  constructor(
    private service: BluetoothSerialService
  ) {
  }

  async scan() {
    const devices = await this.service.scan();
    // TODO open modal
  }
}
