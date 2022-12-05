import {FormFieldDefinition} from '@sumaris-net/ngx-components';

export const APP_SOCIAL_CONFIG_OPTIONS = Object.freeze({
  ENABLE_NOTIFICATION_ICONS: <FormFieldDefinition> {
      key: 'sumaris.social.notification.icons.enable',
      label: 'CONFIGURATION.OPTIONS.SOCIAL.ENABLE_NOTIFICATION_ICONS',
      type: 'boolean',
      defaultValue: false
    }
});
