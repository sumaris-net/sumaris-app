#!/usr/bin/env node

const path = require('path');
const stdio = require('stdio');
const utils = require('./utils')

const PROJECT_DIR = path.resolve(__dirname, '../..');
const LOG_PREFIX = `[${path.basename(__filename)}]`;
const VERSION_PATTERN = '[0-9]{1,2}.[0-9]{1,2}.[0-9]{1,2}(?:(?:(?:-(?:alpha|beta|rc))|[.])[0-9]{1,2})?';

function checkVersion(version) {
  const regexp = new RegExp(`^${VERSION_PATTERN}$`);
  if (! regexp.test(version)) {
    throw new Error(`Version "${version}" does not match with the format "${VERSION_PATTERN}"`)
  }
}

function parseVersion(version) {
  let maj, min, patch, type, num;

  const split = version.replace('-', '.').replace(/(alpha|beta|rc)/, '$1.').split('.');
  if (split.length === 3) [maj, min, patch] = split;
  else if (split.length === 4) [maj, min, patch, num] = split;
  else if (split.length === 5) [maj, min, patch, type, num] = split;
  else throw new Error(`Bad version format ${version}`);

  return {
    maj,
    min,
    patch,
    type,
    num,
  }
}

function computeWebExtVersionCode(version) {
  const v = parseVersion(version);
  return [v.maj, v.min, v.patch, v.num]
    .map(i => (isNaN(i) ? 0 : i))
    .join('.');
}

function computeAndroidVersionCode(version) {
  const v = parseVersion(version);
  // 99 rather 0 to avoid to set alpha, beta, rc greater version number greater than stable
  v.num = !v.num ? '99' : v.num;
  return [v.maj, v.min, v.patch, v.num]
    .map(i => (isNaN(i) ? 0 : i))
    .map((i, index) => (index !== 0 && parseInt(i) < 10) ? ('0' + i) : i)
    .join('');
}

function computeIOSVersionName(version) {
  const v = parseVersion(version);
  return [v.maj, v.min, v.patch] // Valid version is  x.y.z
    .map(i => (isNaN(i) ? 0 : i))
    .join('.');
}

function computeIOSVersionCode(version) {
  const v = parseVersion(version);
  // 99 rather 0 to avoid to set alpha, beta, rc greater version number greater than stable
  v.num = !v.num ? '99' : v.num;
  return [v.maj, v.min, v.patch, v.num]
    .map(i => (isNaN(i) ? 0 : i))
    .map((i, index) => (index !== 0 && parseInt(i) < 10) ? ('0' + i) : i)
    .join('');
}

function updateVersion(version) {
  const regexp = /(^\s+"version":)(\s+"[^"]+",$)/;
  [
    path.join(PROJECT_DIR, 'package.json'),
    path.join(PROJECT_DIR, 'electron', 'package.json'),
    path.join(PROJECT_DIR, 'src', 'assets', 'manifest.json'),
  ].forEach(file => {
      console.info(`${LOG_PREFIX} update version standard in ${file}`);
      utils.replaceTextInFile(file, [
        {
          searchValue: regexp,
          replaceValue: `$1 "${version}",`,
        },
      ])
    });
}

function updateElectronBuilderVersion(version) {
  const regexp = new RegExp('(^\\s+"artifactName":\\s"\\$\\{name\\}-)(' + VERSION_PATTERN + ')(-.+$)');
  [
    path.join(PROJECT_DIR, 'electron', 'electron-builder.config.json'),
  ].forEach(file => {
      console.info(`${LOG_PREFIX} update version standard in ${file}`);
      utils.replaceTextInFile(file, [
        {
          searchValue: regexp,
          replaceValue: `$1${version}$3`,
        },
      ])
    });
}

function updateWebExtVersion(versionCode, versionName) {
  const regexpVersionCode = /(^\s+"version":)(\s+"[^"]+",$)/;
  const regexpVersionName = /(^\s+"version_name":)(\s+"[^"]+",$)/;
  [
    path.join(PROJECT_DIR, 'resources', 'webext', 'manifest.json'),
  ].forEach(file => {
      console.info(`${LOG_PREFIX} update version webext in ${file}`);
      utils.replaceTextInFile(file, [
        {
          searchValue: regexpVersionCode,
          replaceValue: `$1 "${versionCode}",`,
        },
        {
          searchValue: regexpVersionName,
          replaceValue: `$1 "${versionName}",`,
        },
      ])
    });
}

function updateAndroidVersion(versionCode, versionName) {
  const regexpVersionCode = /(^\s+versionCode)(\s+\d+$)/;
  const regexpVersionName = /(\s+versionName)(\s+"[^"]+"$)/;
  [
    path.join(PROJECT_DIR, 'android', 'app', 'build.gradle'),
  ].forEach(file => {
      console.info(`${LOG_PREFIX} update version android in ${file}`);
      utils.replaceTextInFile(file, [
        {
          searchValue: regexpVersionCode,
          replaceValue: `$1 ${versionCode}`,
        },
        {
          searchValue: regexpVersionName,
          replaceValue: `$1 "${versionName}"`,
        }
      ])
    });
}

function updateIOSVersion(versionCode, versionName) {
  const regexpVersionCode = /(^\s+CURRENT_PROJECT_VERSION)\s*=\s*[^;]+;$/;
  const regexpVersionName = /(^\s+MARKETING_VERSION)\s*=\s*[^;]+;$/;
  [
    path.join(PROJECT_DIR, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj'),
  ].forEach(file => {
    console.info(`${LOG_PREFIX} update version iOS in ${file}`);
    utils.replaceTextInFile(file, [
      {
        searchValue: regexpVersionCode,
        replaceValue: `$1 = ${versionCode};`,
      },
      {
        searchValue: regexpVersionName,
        replaceValue: `$1 = ${versionName};`,
      }
    ])
  });
}

function updateInstallSh(version) {
  const file = path.join(PROJECT_DIR, 'install.sh');
  console.info(`${LOG_PREFIX} update version in ${file}`);
  utils.replaceTextInFile(file, [
    {
      searchValue: /(^\s*echo\s+")([^"]*)("\s+\#lastest$)/,
      replaceValue: `$1${version}$3`,
    },
  ]);
}

async function main() {

  const options = stdio.getopt({
    set: {
      key: 's',
      description: `Version to set in format compliant with "${VERSION_PATTERN}"`,
      args: 1,
    },
  });

  // This mean no version is provided as arg for set
  if (options.set && options.set === true) {
      console.error(`${LOG_PREFIX} set require version as argument`);
      return;
  }
  const version = options.set || require(path.join(PROJECT_DIR, 'package.json')).version;


  checkVersion(version);
  const webExtVersionCode = computeWebExtVersionCode(version);
  const androidVersionCode = computeAndroidVersionCode(version);
  const iosVersionCode = computeIOSVersionCode(version);
  const iosVersionName = computeIOSVersionName(version);

  if (options.set) {
    updateVersion(version);
    updateElectronBuilderVersion(version);
    updateWebExtVersion(webExtVersionCode, version);
    updateAndroidVersion(androidVersionCode, version);
    updateIOSVersion(iosVersionCode, iosVersionName);
    updateInstallSh(version);
  }

  console.info(`${LOG_PREFIX} Computed version ${options.set ? 'updated' : 'current'}:`,
    `\n\tstandard : ${version}`,
    `\n\twebext : ${webExtVersionCode}`,
    `\n\tandroid : ${androidVersionCode}`,
    `\n\tios : ${iosVersionCode} - ${iosVersionName}`);
}

main();
