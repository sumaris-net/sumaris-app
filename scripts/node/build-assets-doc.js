#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const showdown = require('showdown');
const { existsSync, mkdirSync } = require("fs");

const PROJECT_DIR = path.resolve(__dirname, '../..'); // Project root directory
const appName = require(path.join(PROJECT_DIR, 'package.json')).description.split(' ', 2)[0];
const sourceDocDir = path.join(PROJECT_DIR, 'doc');
const targetDocDir = process.argv[2] || path.join(PROJECT_DIR, 'www/assets/doc');
if (!existsSync(targetDocDir)) {
  mkdirSync(targetDocDir, {recursive: true});
}
// Initialize the Markdown-to-HTML converter
const converter = new showdown.Converter();

/**
 * Generic function to generate and copy files (Markdown and HTML)
 *
 * @param {string} fileName - Base name of the Markdown file (e.g., without `_fr`).
 * @param {boolean} includeLocalized - Whether to handle the localized file with `_fr` suffix.
 */
function generateAndCopy(fileName, includeLocalized = false) {
  const sourceFilePath = path.resolve(sourceDocDir, `${fileName}.md`);
  const targetMdFilePath = path.resolve(targetDocDir, `${fileName}.md`);
  const targetHtmlFilePath = path.resolve(targetDocDir, `${fileName}.html`);


  try {
    console.info(`- Processing ${sourceFilePath} -> ${targetHtmlFilePath}`);

    // Copy the Markdown file to src/assets
    if (fs.existsSync(sourceFilePath)) {
      fs.copyFileSync(sourceFilePath, targetMdFilePath);
    } else {
      console.error(`Source Markdown file not found: ${sourceFilePath}`);
      process.exit(1);
    }

    // Read and convert Markdown content to HTML
    const markdownContent = fs.readFileSync(sourceFilePath, { encoding: 'utf-8' });
    const htmlContent = converter.makeHtml(markdownContent.toString());

    // Wrap the HTML content in a basic template
    const fullHtmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName} - ${fileName.replace('_', ' ')}</title>
</head>
<body>
  ${htmlContent}
</body>
</html>
`;

    // Save the generated HTML file in src/assets
    fs.writeFileSync(targetHtmlFilePath, fullHtmlContent, { encoding: 'utf-8' });
  } catch (err) {
    console.error(`Error processing file ${fileName}:`, err);
    process.exit(1);
  }

  // Process the localized version with `_fr` suffix if requested
  if (includeLocalized) {
    const localizedFileName = `${fileName}_fr`;
    const localizedInputFilePath = path.resolve(PROJECT_DIR, `doc/${localizedFileName}.md`);
    if (fs.existsSync(localizedInputFilePath)) {
      generateAndCopy(localizedFileName, false); // Recursive call for the localized version
    } else {
      console.warn(`   Localized source file not found: ${localizedInputFilePath} - skipping`);
    }
  }
}


if (existsSync(targetDocDir)) {
  console.debug('Generate assets/doc from markdown files... ' + targetDocDir);

  // Generate files for each required document
  generateAndCopy('privacy_policy', true);
  generateAndCopy('terms_of_use', true);

  console.debug('Generate assets/doc from markdown files [OK]');
}
