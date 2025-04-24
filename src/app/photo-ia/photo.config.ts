import { FormFieldDefinition } from '@sumaris-net/ngx-components';

export const PHOTO_CONFIG_OPTIONS = Object.freeze({
  PHOTO_ENABLE: <FormFieldDefinition>{
    key: 'sumaris.photo.enable',
    label: 'PHOTO.OPTIONS.ENABLE',
    type: 'boolean',
  },
  PHOTO_NAME: <FormFieldDefinition>{
    key: 'sumaris.photo.name',
    label: 'PHOTO.OPTIONS.NAME',
    type: 'enum',
    defaultValue: 'MENU.PHOTOS',
  },
});
