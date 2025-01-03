#!/usr/bin/env node

(async () => {
  const fs = require('fs');
  const compat = require('core-js-compat');
  const path = require('path');
  const utils = require('./utils');

  const projectDir = path.resolve(__dirname, '../..');

  const browserslistPath = path.resolve(projectDir, '.browserslistrc');
  if (! fs.existsSync(browserslistPath)) throw Error(`${browserslistPath} does not exist.`)
  if (! utils.canRead(browserslistPath)) throw Error(`"${browserslistPath} is not readable.`);

  const browserslist = fs.readFileSync(browserslistPath, 'utf8').toString()

  const browserslistTargets = browserslist.split('\n')
    .map(line => line.trim())
    .map(line => {
      const commentIndex = line.indexOf('#');
      if (commentIndex !== -1) return line.substring(0, commentIndex).trim();
      return line;
    })
    .filter(line => line.length > 0 && !line.startsWith('#'));
  console.debug('[utils] Targets (`.browserslistrc` file):', browserslistTargets);

  const {
    list,                       // array of required modules
    targets,                    // object with targets for each module
  } = compat({targets: browserslistTargets.join(', ')});

  console.debug('[utils] core-js polyfills (will be added automatically by the angular builder):', list);
  //console.debug('[main] core-js-compact - targets:', targets);
})().catch(err => {
  console.log(err);
  process.exit(1);
});
