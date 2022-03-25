module.exports = {
  packages: {
    'angular2-text-mask': {
      ignorableDeepImportMatchers: [
        /text-mask-core\//,
      ]
    },
    '@sumaris-net/ngx-components': {
      ignorableDeepImportMatchers: [
        /@ionic-native\//,
        /ionic-cache\//,
        /@apollo\//,
        /uuid\//,
        /zone.js\//,
        /zone-error\//,
        /apollo-angular\//,
        /moment\//,
        /moment-timezone\//,
        /ngx-material-table\//
      ]
    }
  }
};
