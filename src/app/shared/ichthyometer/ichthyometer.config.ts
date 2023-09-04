import { FormFieldDefinition } from '@sumaris-net/ngx-components';

export const ICHTHYOMETER_LOCAL_SETTINGS_OPTIONS = {
  ICHTHYOMETERS: <FormFieldDefinition>{
    key: 'sumaris.ichthyometer.devices',
    label: 'SHARED.ICHTHYOMETER.SETTINGS.DEVICES',
    type: 'entities',
    autocomplete: {
      attributes: ['name', 'address'],
      columnNames: ['SHARED.BLUETOOTH.NAME', 'SHARED.BLUETOOTH.ADDRESS'],
      displayWith: device => device?.name || device?.address || ''
      //suggestFn: /!\ suggest function set inside the app.components.ts, to be able to use the ichthyometer service
    },
    defaultValue: []
  }
}
