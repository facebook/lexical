#!/usr/bin/env node

'use strict';

const {exec} = require('child-process-promise');
const {LEXICAL_PKG, LEXICAL_HELPERS_PKG, DEFAULT_PKGS} = require('./packages');

async function prepareLexicalPackage() {
  await exec(`rm -rf ./packages/${LEXICAL_PKG}/npm`);
  await exec(`mkdir ./packages/${LEXICAL_PKG}/npm`);
  await exec(
    `cp -R ./packages/${LEXICAL_PKG}/dist/*.js ./packages/${LEXICAL_PKG}/npm`,
  );

  // Remap the node extensions to their short versions
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalCodeNode.js ./packages/${LEXICAL_PKG}/npm/CodeNode.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalQuoteNode.js ./packages/${LEXICAL_PKG}/npm/QuoteNode.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalHashtagNode.js ./packages/${LEXICAL_PKG}/npm/HashtagNode.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalLinkNode.js ./packages/${LEXICAL_PKG}/npm/LinkNode.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalHeadingNode.js ./packages/${LEXICAL_PKG}/npm/HeadingNode.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalAutoLinkNode.js ./packages/${LEXICAL_PKG}/npm/AutoLinkNode.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalCodeHighlightNode.js ./packages/${LEXICAL_PKG}/npm/CodeHighlightNode.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalExtendedNodes.js ./packages/${LEXICAL_PKG}/npm/LexicalExtendedNode.js`,
  );
  // Other bits
  await exec(
    `cp -R ./packages/${LEXICAL_PKG}/package.json ./packages/${LEXICAL_PKG}/npm`,
  );
  await exec(`cp -R LICENSE ./packages/${LEXICAL_PKG}/npm`);
  await exec(
    `cp -R ./packages/${LEXICAL_PKG}/README.md ./packages/${LEXICAL_PKG}/npm`,
  );
  // Flow Types
  await exec(
    `cp -R ./packages/${LEXICAL_PKG}/flow/*.flow ./packages/${LEXICAL_PKG}/npm`,
  );
  // Remap Flow Types
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalCodeNode.js.flow ./packages/${LEXICAL_PKG}/npm/CodeNode.js.flow`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalQuoteNode.js.flow ./packages/${LEXICAL_PKG}/npm/QuoteNode.js.flow`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalHashtagNode.js.flow ./packages/${LEXICAL_PKG}/npm/HashtagNode.js.flow`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalLinkNode.js.flow ./packages/${LEXICAL_PKG}/npm/LinkNode.js.flow`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalHeadingNode.js.flow ./packages/${LEXICAL_PKG}/npm/HeadingNode.js.flow`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalAutoLinkNode.js.flow ./packages/${LEXICAL_PKG}/npm/AutoLinkNode.js.flow`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalCodeHighlightNode.js.flow ./packages/${LEXICAL_PKG}/npm/CodeHighlightNode.js.flow`,
  );
  await exec(
    `mv ./packages/${LEXICAL_PKG}/npm/LexicalExtendedNodes.js.flow ./packages/${LEXICAL_PKG}/npm/LexicalExtendedNode.js.flow`,
  );
}

async function prepareLexicalHelpersPackage() {
  await exec(`rm -rf ./packages/${LEXICAL_HELPERS_PKG}/npm`);
  await exec(`mkdir ./packages/${LEXICAL_HELPERS_PKG}/npm`);
  await exec(
    `cp -R ./packages/${LEXICAL_HELPERS_PKG}/dist/*.js ./packages/${LEXICAL_HELPERS_PKG}/npm`,
  );
  // Remap the helper packages to their short versions
  await exec(
    `mv ./packages/${LEXICAL_HELPERS_PKG}/npm/LexicalSelectionHelpers.js ./packages/${LEXICAL_HELPERS_PKG}/npm/selection.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_HELPERS_PKG}/npm/LexicalTextHelpers.js ./packages/${LEXICAL_HELPERS_PKG}/npm/text.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_HELPERS_PKG}/npm/LexicalEventHelpers.js ./packages/${LEXICAL_HELPERS_PKG}/npm/events.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_HELPERS_PKG}/npm/LexicalOffsetHelpers.js ./packages/${LEXICAL_HELPERS_PKG}/npm/offsets.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_HELPERS_PKG}/npm/LexicalNodeHelpers.js ./packages/${LEXICAL_HELPERS_PKG}/npm/nodes.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_HELPERS_PKG}/npm/LexicalElementHelpers.js ./packages/${LEXICAL_HELPERS_PKG}/npm/elements.js`,
  );
  await exec(
    `mv ./packages/${LEXICAL_HELPERS_PKG}/npm/LexicalRootHelpers.js ./packages/${LEXICAL_HELPERS_PKG}/npm/root.js`,
  );
  // Other bits
  await exec(
    `cp -R ./packages/${LEXICAL_HELPERS_PKG}/package.json ./packages/${LEXICAL_HELPERS_PKG}/npm`,
  );
  await exec(`cp -R LICENSE ./packages/${LEXICAL_HELPERS_PKG}/npm`);
  await exec(
    `cp -R ./packages/${LEXICAL_HELPERS_PKG}/README.md ./packages/${LEXICAL_HELPERS_PKG}/npm`,
  );
}

async function prepareDefaultPackages() {
  for (let i = 0; i < DEFAULT_PKGS.length; i++) {
    const pkg = DEFAULT_PKGS[i];
    await exec(`rm -rf ./packages/${pkg}/npm`);
    await exec(`mkdir ./packages/${pkg}/npm`);
    await exec(`cp -R ./packages/${pkg}/dist/*.js ./packages/${pkg}/npm`);
    try {
      await exec(`cp -R ./packages/${pkg}/flow/*.flow ./packages/${pkg}/npm`);
    } catch {
      console.error(`Missing Flow type definitions for package ${pkg}`);
    }
    await exec(`cp -R ./packages/${pkg}/package.json ./packages/${pkg}/npm`);
    await exec(`cp -R LICENSE ./packages/${pkg}/npm`);
    await exec(`cp -R ./packages/${pkg}/README.md ./packages/${pkg}/npm`);
  }
}

prepareLexicalPackage();
prepareLexicalHelpersPackage();
prepareDefaultPackages();
