#!/usr/bin/env node

'use strict';

const {exec} = require('child-process-promise');

async function prepareLexicalCorePackage() {
  await exec(`rm -rf ./packages/lexical/npm`);
  await exec(`mkdir ./packages/lexical/npm`);
  await exec(`cp -R ./packages/lexical/dist/*.js ./packages/lexical/npm`);

  // Remap the node extensions to their short versions
  await exec(
    `mv ./packages/lexical/npm/LexicalCodeNode.js ./packages/lexical/npm/CodeNode.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalQuoteNode.js ./packages/lexical/npm/QuoteNode.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalHashtagNode.js ./packages/lexical/npm/HashtagNode.js`,
  );

  await exec(
    `mv ./packages/lexical/npm/LexicalLinkNode.js ./packages/lexical/npm/LinkNode.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalHeadingNode.js ./packages/lexical/npm/HeadingNode.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalAutoLinkNode.js ./packages/lexical/npm/AutoLinkNode.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalCodeHighlightNode.js ./packages/lexical/npm/CodeHighlightNode.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalExtendedNodes.js ./packages/lexical/npm/LexicalExtendedNode.js`,
  );
  // Other bits
  await exec(`cp -R ./packages/lexical/package.json ./packages/lexical/npm`);
  await exec(`cp -R LICENSE ./packages/lexical/npm`);
  await exec(`cp -R ./packages/lexical/README.md ./packages/lexical/npm`);
}

async function prepareLexicalHelpersPackage() {
  await exec(`rm -rf ./packages/lexical-helpers/npm`);
  await exec(`mkdir ./packages/lexical-helpers/npm`);
  await exec(
    `cp -R ./packages/lexical-helpers/dist/*.js ./packages/lexical-helpers/npm`,
  );
  // Remap the helper packages to their short versions
  await exec(
    `mv ./packages/lexical-helpers/npm/LexicalSelectionHelpers.js ./packages/lexical-helpers/npm/selection.js`,
  );
  await exec(
    `mv ./packages/lexical-helpers/npm/LexicalTextHelpers.js ./packages/lexical-helpers/npm/text.js`,
  );
  await exec(
    `mv ./packages/lexical-helpers/npm/LexicalEventHelpers.js ./packages/lexical-helpers/npm/events.js`,
  );
  await exec(
    `mv ./packages/lexical-helpers/npm/LexicalOffsetHelpers.js ./packages/lexical-helpers/npm/offsets.js`,
  );
  await exec(
    `mv ./packages/lexical-helpers/npm/LexicalNodeHelpers.js ./packages/lexical-helpers/npm/nodes.js`,
  );
  await exec(
    `mv ./packages/lexical-helpers/npm/LexicalElementHelpers.js ./packages/lexical-helpers/npm/elements.js`,
  );
  await exec(
    `mv ./packages/lexical-helpers/npm/LexicalRootHelpers.js ./packages/lexical-helpers/npm/root.js`,
  );
  // Other bits
  await exec(
    `cp -R ./packages/lexical-helpers/package.json ./packages/lexical-helpers/npm`,
  );
  await exec(`cp -R LICENSE ./packages/lexical-helpers/npm`);
  await exec(
    `cp -R ./packages/lexical-helpers/README.md ./packages/lexical-helpers/npm`,
  );
}

async function prepareLexicalReactPackage() {
  await exec(`rm -rf ./packages/lexical-react/npm`);
  await exec(`mkdir ./packages/lexical-react/npm`);
  await exec(
    `cp -R ./packages/lexical-react/dist/*.js ./packages/lexical-react/npm`,
  );
  await exec(
    `cp -R ./packages/lexical-react/package.json ./packages/lexical-react/npm`,
  );
  await exec(`cp -R LICENSE ./packages/lexical-react/npm`);
  await exec(
    `cp -R ./packages/lexical-react/README.md ./packages/lexical-react/npm`,
  );
}

async function prepareLexicalYjsPackage() {
  await exec(`rm -rf ./packages/lexical-yjs/npm`);
  await exec(`mkdir ./packages/lexical-yjs/npm`);
  await exec(
    `cp -R ./packages/lexical-yjs/dist/LexicalYjs.js ./packages/lexical-yjs/npm/index.js`,
  );
  await exec(
    `cp -R ./packages/lexical-yjs/package.json ./packages/lexical-yjs/npm`,
  );
  await exec(`cp -R LICENSE ./packages/lexical-yjs/npm`);
  await exec(
    `cp -R ./packages/lexical-yjs/README.md ./packages/lexical-yjs/npm`,
  );
}

async function prepareLexicalFeaturePackages() {
  const packages = ['lexical-list', 'lexical-table', 'lexical-file'];
  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    await exec(`rm -rf ./packages/${pkg}/npm`);
    await exec(`mkdir ./packages/${pkg}/npm`);
    await exec(`cp -R ./packages/${pkg}/dist/*.js ./packages/${pkg}/npm`);
    await exec(`cp -R ./packages/${pkg}/package.json ./packages/${pkg}/npm`);
    await exec(`cp -R LICENSE ./packages/${pkg}/npm`);
    await exec(`cp -R ./packages/${pkg}/README.md ./packages/${pkg}/npm`);
  }
}

prepareLexicalCorePackage();
prepareLexicalHelpersPackage();
prepareLexicalReactPackage();
prepareLexicalYjsPackage();
prepareLexicalFeaturePackages();
