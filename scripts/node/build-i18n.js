'use strict';

const { join } = require('path');
const { readdirSync, readFileSync, copyFileSync, existsSync, rmSync } = require('fs');

let pkgStr = readFileSync('./package.json', {encoding: 'UTF-8'});
const pkg = JSON.parse(pkgStr);

const sourceI18nDir = './src/assets/i18n/';
let targetI18nDir = './www/assets/i18n/';
if (!existsSync(targetI18nDir)) {
  targetI18nDir = sourceI18nDir;
}

if (existsSync(targetI18nDir)) {
  console.debug('Insert version into I18n files... ' + targetI18nDir);

  // For each files
  readdirSync(targetI18nDir)
    // Filter in src i18n files (skip renamed files)
    .filter(file => file.match(/^[a-z]{2}(-[A-Z]{2})?\.json$/))
    .forEach(file => {
      const filePath = join(targetI18nDir, file);
      const newFilePath = join(targetI18nDir, file.replace(/([a-z]{2}(:?-[A-Z]{2})?)\.json/, '$1-' + pkg.version + '.json'));

      console.debug(' - Copying ' + filePath + ' -> ' + newFilePath);

      copyFileSync(filePath, newFilePath);
    });

  console.debug('Insert version into I18n files [OK]');

}
