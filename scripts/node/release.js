#!/usr/bin/env node

import { sleep } from "./utils";

(async () => {

  const path = require('path');
  const stdio = require('stdio');
  const utils = require('./utils');
  const fs = require('fs');
  const {Gitlab} = await import('@gitbeaker/rest');

  const LOG_PREFIX = `[${path.basename(__filename)}]`;

  const GITLAB_HOST_NAME = 'gitlab.ifremer.fr';
  const GITLAB_PROJECT_ID = 'sih-public/sumaris/sumaris-app';

  const OPTIONS = stdio.getopt({
    token: {
      key: 't',
      description: "Gitlab private token",
      default: false,
      args: 1,
      required: true,
    },
    description: {
      key: 'd',
      description: "Get release description for the given milestone",
      default: false,
      args: 1,
      required: false,
    },
    upload: {
      key: 'u',
      default: false,
      description: 'Upload package file. Take 4 positional arguments :\n'
        + 'First 3 are required : "project name" ; "tag version" ; "path to file"\n'
        + 'Last is optional, if is "link_release" it also create asset link for release corresponding to the "tag version"',
      args: '*',
      required: false,
    },
    link: {
      key: 'l',
      description: 'Create assets link. Take 4 positional arguments\n'
        + '\tFirst 3 are required : "release tag name" ; "asset name" ; "assets url"\n'
        + '\tLast is optional :  "link type", it can be one of "other", "runbook", "image", "package", "other" by default',
      default: false,
      args: '*',
      required: false,
    },
    release: {
      key: 'r',
      description: 'Create assets link. Take 3 positional arguments :\n'
        + '"release name" ; "tag name" ; "commit ref"',
      default: false,
      args: '*',
      required: false,
    },
  });

  const GITLAB = new Gitlab({
    host: `https://${GITLAB_HOST_NAME}`,
    jobToken: OPTIONS.token,
    // For local testing with user token
    // token: OPTIONS.token,
  });

  function computeGitlabApiProjectUrl() {
    return `https://${GITLAB_HOST_NAME}/api/v4/projects/`
           + GITLAB_PROJECT_ID.replace(/\//g, '%2F');
  }

  async function descriptionCheck() {
    utils.logMessage('I', LOG_PREFIX, 'check if milestone exists...');
    // Milestone is given as argument for description
    const milestoneTag = OPTIONS.description;
    if (! milestoneTag || typeof milestoneTag !== 'string') {
      utils.logMessage('E', LOG_PREFIX, 'Milestone is not provided');
      process.exit(1);
    }
  }

  async function descriptionCompute(milestone) {
    utils.logMessage('I', LOG_PREFIX, 'get release description...');
    const issues = await descriptionGetIssues(milestone);
    const changes = await descriptionGetChanges(milestone);
    return ('\n# Changes\n\n'  +
            changes +
           '\n# Issues\n\n' +
           issues).replace(/\'/g, '\\\'');
  }

  async function descriptionGetChanges(milestone) {
    utils.logMessage('I', LOG_PREFIX, 'gen changes for release description...');
    try {
      const items = await GITLAB.MergeRequests.all({
        projectId: GITLAB_PROJECT_ID,
        milestone: milestone,
        state: 'merged',
      });
      if (items.length === 0) return '* no changes\n';
      return items
        .map((i) => `* ${i.title} ([!${i.iid}](${i.web_url}))`)
        .join('\n') + '\n';
    } catch(e) {
      utils.logMessage('E', LOG_PREFIX, e);
      process.exit(1);
    }
  }

  async function descriptionGetIssues(milestone) {
    utils.logMessage('I', LOG_PREFIX, 'gen issues for release description...');
    try {
      const items = await GITLAB.Issues.all({
        projectId: GITLAB_PROJECT_ID,
        milestone: milestone,
        state: 'closed',
      })
      if (items.length === 0) return '* no issues fixed\n';
      return items
        .map((i) => `* ${i.title} ([#${i.iid}](${i.web_url}) - ${i.state})`)
        .join('\n') + '\n';
    } catch(e) {
      utils.logMessage('E', LOG_PREFIX, e);
      process.exit(1);
    }
  }

  async function assetsLinkCheckExists(tagName, name) {
    utils.logMessage('I', LOG_PREFIX, `Check if asset link "${name}" exists for tag "${tagName}"`);
    try {
      const res = await fetch(`${computeGitlabApiProjectUrl()}/releases/${tagName}/assets/links`);
      if (res.status === 404) return false;
      else if (res.status !== 200)
        throw new Error(`${res.status} ${res.statusText}`);
      const items = await res.json();
      const found = items.find((item) => item.name === name);
      if (!found || found.length === 0) return false;
      else return found.id;
    } catch(e) {
      utils.logMessage('E', LOG_PREFIX, e);
      process.exit(1);
    }
  }

  async function checkReleaseExists(tagName, waitTimeoutMs, createIfNotExists) {
    waitTimeoutMs = waitTimeoutMs || 5000;
    utils.logMessage('I', LOG_PREFIX, `Check if release exists for tag "${tagName}"`);
    try {
      let exists = await isReleaseExists(tagName);
      const now = Date.now();
      while (!exists && (Date.now() - now) < waitTimeoutMs) {
        utils.logMessage('I', LOG_PREFIX, `Waiting release creation ...`);
        await sleep(1000);
        exists = await isReleaseExists(tagName);
      }
      if (exists) return true; // OK
      if (createIfNotExists) {
        utils.logMessage('I', LOG_PREFIX, `Release not found, after waiting ${waitTimeoutMs}ms. Will create the release`);
        await releaseCreate(tagName, `Release ${tagName}`, waitTimeoutMs);
        return true;
      }
      return false;
    } catch(e) {
      utils.logMessage('E', LOG_PREFIX, e);
      process.exit(1);
    }
  }

  async function assetsLinkCreate(tagName, name, url, type) {
    utils.logMessage('I', LOG_PREFIX,
      `Create assets_link : tag=${tagName}, name=${name}, url=${url}, type=${type}`);
    try {
      const existingId = await assetsLinkCheckExists(tagName, name);
      if (existingId) {
        utils.logMessage('I', LOG_PREFIX, `Remove previous assets link with id=${existingId}`);
        await GITLAB.ReleaseLinks.remove(GITLAB_PROJECT_ID, tagName, existingId);
      }
      // Link not exists: check release exists
      else {
        await checkReleaseExists(tagName, name, 4000, true /*create release if need*/);
      }
      await GITLAB.ReleaseLinks.create(GITLAB_PROJECT_ID, tagName, name, url, {linkType: type});
    } catch(e) {
      utils.logMessage('E', LOG_PREFIX, e);
      process.exit(1);
    }
  }

  async function packageUpload(projectName, version, filePath, linkRelease) {
    const fileName = path.basename(filePath);
    const uploadUrl = `${computeGitlabApiProjectUrl()}/packages/generic/${projectName}/${version}/${fileName}`;
    utils.logMessage('I', LOG_PREFIX, `Deploy to gitlab package "${uploadUrl}"`);

    if (! fs.existsSync(filePath)) {
      utils.logMessage('E', LOG_PREFIX, `${filePath} not exists`);
      process.exit(1);
    }

    await packageCleanFile(projectName, version, fileName);

    try {
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          "Content-Length": fs.statSync(filePath).size,
          "Content-type": 'application/octet-stream',
          // For local testing with user token
          // "PRIVATE-TOKEN": OPTIONS.token,
          "JOB-TOKEN": OPTIONS.token,
        },
        body: fs.readFileSync(filePath),
      });
    } catch(e) {
      utils.logMessage('E', LOG_PREFIX, e);
      process.exit(1);
    }

    if (linkRelease)
      await assetsLinkCreate(version, fileName, uploadUrl, "package");
  }

  async function packageCleanFile(projectName, version, fileName) {
    const packageId = await packageGetId(projectName, version);
    if (packageId === 0) {
      utils.logMessage('I', LOG_PREFIX, `No package for version "${version}"`);
      return;
    }
    const packageFiles = await packagesGetFiles(packageId);

    for (const item of packageFiles) {
      try {
        if (item.file_name !== fileName) continue;
        utils.logMessage('I', LOG_PREFIX, `Remove package existing file "${fileName}" for version "${version}"`);
        await GITLAB.Packages.removeFile(GITLAB_PROJECT_ID, packageId, item.id);
      } catch(e) {
        utils.logMessage('E', LOG_PREFIX, e);
        process.exit(1);
      }
    }
  }

  async function packageGetId(projectName, version) {
    try {
      const res = await fetch(`${computeGitlabApiProjectUrl()}/packages?package_name=${projectName}&package_version=${version}`);
      if (res.status !== 200) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const items = await res.json();
      if (items.length === 0) return 0;
      return items[0].id;
    } catch(e) {
      utils.logMessage('E', LOG_PREFIX, e);
      process.exit(1);
    }
  }

  async function packagesGetFiles(packageId) {
    try {
      return await await GITLAB.Packages.allFiles(GITLAB_PROJECT_ID, packageId);
    } catch(e) {
      utils.logMessage('E', LOG_PREFIX, e);
      process.exit(1);
    }
  }

  async function isReleaseExists(tagName) {
    utils.logMessage('I', LOG_PREFIX, `Check if release for tag "${tagName}" exists`);
    try {
      const res = await fetch(`${computeGitlabApiProjectUrl()}/releases/${tagName}`);
      if (res.status === 200) return true;
      if (res.status === 404) return false;
      // Any other status: throw error (this should never occur)
      throw new Error(`${res.status} ${res.statusText}`);
    } catch(e) {
      utils.logMessage('E', LOG_PREFIX, e);
      process.exit(1);
    }
  }

  async function releaseCreate(tagName, name, ref) {
    utils.logMessage('I', LOG_PREFIX, `Create ${name} with tagName="${tagName}", ref="${ref}"`);
    const description = await descriptionCompute(tagName);
    try {
      await GITLAB.ProjectReleases.create(GITLAB_PROJECT_ID, {
        name: name,
        tag_name: tagName,
        description: description,
        ref: ref,
      });
    } catch(e) {
      utils.logMessage('E', LOG_PREFIX, e);
      process.exit(1);
    }
  }

  async function releaseUpdate(tagName) {
    utils.logMessage('I', LOG_PREFIX, `Update release for tag "${tagName}""`);
    const description = await descriptionCompute(tagName);
    try {
      await GITLAB.ProjectReleases.edit(GITLAB_PROJECT_ID, tagName, {
        description: description,
      });
    } catch(e) {
      utils.logMessage('E', LOG_PREFIX, e);
      process.exit(1);
    }
  }

  async function main() {
    if (OPTIONS.description) {
      await descriptionCheck();
      const releaseDescription = await descriptionCompute(OPTIONS.description);
      process.stdout.write(releaseDescription);
    }

    if (OPTIONS.release) {
      if (typeof OPTIONS.release !== 'object' || OPTIONS.link.length < 3) {
        utils.logMessage('E', LOG_PREFIX, 'Bad release arguments');
        process.exit(1);
      }
      const name = OPTIONS.release[0];
      const tagName = OPTIONS.release[1];
      const ref = OPTIONS.release[2];
      const exists = await isReleaseExists(tagName);
      if (exists) await releaseUpdate(tagName);
      else await releaseCreate(tagName, name, ref);
    }

    if (OPTIONS.upload) {
      if (typeof OPTIONS.upload !== 'object' || OPTIONS.link.length < 3) {
        utils.logMessage('E', LOG_PREFIX, 'Bad upload arguments');
        process.exit(1);
      }
      const projectName = OPTIONS.upload[0];
      const version = OPTIONS.upload[1];
      const filePath = OPTIONS.upload[2];
      const linkRelease = OPTIONS.upload[3] === 'link_release' ? true : false;
      await packageUpload(projectName, version, filePath, linkRelease);
    }

    if (OPTIONS.link) {
      if (typeof OPTIONS.link !== 'object' || OPTIONS.link.length < 3) {
        utils.logMessage('E', LOG_PREFIX, 'Bad link arguments');
        process.exit(1);
      }
      const tag = OPTIONS.link[0];
      const name = OPTIONS.link[1];
      const url = OPTIONS.link[2];
      const type = OPTIONS.link[3] || 'other';
      await assetsLinkCreate(tag, name, url, type);
    }
  };

  await main();
})().catch(err => {
    console.log(err);
    process.exit(1);
});
