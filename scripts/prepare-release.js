#!/usr/bin/env node

'use strict';

const {exec} = require('child-process-promise');
const fs = require('fs');
const path = require('path');

async function prepareOutlinePackage() {
  await exec(`rm -rf ./packages/outline/npm`);
  await exec(`mkdir ./packages/outline/npm`);
  await exec(`cp -R ./packages/outline/dist/*.js ./packages/outline/npm`);
  // Remap the helper packages to their short versions
  await exec(`mv ./packages/outline/npm/OutlineSelectionHelpers.js ./packages/outline/npm/selection.js`);
  await exec(`mv ./packages/outline/npm/OutlineTextHelpers.js ./packages/outline/npm/text.js`);
  await exec(`mv ./packages/outline/npm/OutlineKeyHelpers.js ./packages/outline/npm/keys.js`);
  await exec(`mv ./packages/outline/npm/OutlineEventHelpers.js ./packages/outline/npm/events.js`);
  await exec(`mv ./packages/outline/npm/OutlineHistoryHelpers.js ./packages/outline/npm/history.js`);
  await exec(`mv ./packages/outline/npm/OutlineOffsetHelpers.js ./packages/outline/npm/offsets.js`);
  await exec(`mv ./packages/outline/npm/OutlineNodeHelpers.js ./packages/outline/npm/nodes.js`);
  await exec(`mv ./packages/outline/npm/OutlineRootHelpers.js ./packages/outline/npm/validation.js`);
  // Remap the node extensions to their short versions
  await exec(`mv ./packages/outline/npm/OutlineCodeNode.js ./packages/outline/npm/CodeNode.js`);
  await exec(`mv ./packages/outline/npm/OutlineParagraphNode.js ./packages/outline/npm/ParagraphNode.js`);
  await exec(`mv ./packages/outline/npm/OutlineQuoteNode.js ./packages/outline/npm/QuoteNode.js`);
  await exec(`mv ./packages/outline/npm/OutlineHashtagNode.js ./packages/outline/npm/HashtagNode.js`);
  await exec(`mv ./packages/outline/npm/OutlineListNode.js ./packages/outline/npm/ListNode.js`);
  await exec(`mv ./packages/outline/npm/OutlineListItemNode.js ./packages/outline/npm/ListItemNode.js`);
  await exec(`mv ./packages/outline/npm/OutlineLinkNode.js ./packages/outline/npm/LinkNode.js`);
  await exec(`mv ./packages/outline/npm/OutlineHeadingNode.js ./packages/outline/npm/HeadingNode.js`);
  // Other bits
  await exec(`cp -R ./packages/outline/package.json ./packages/outline/npm`);
  await exec(`cp -R LICENSE ./packages/outline/npm`);
  await exec(`cp -R ./packages/outline/README.md ./packages/outline/npm`);
}

async function prepareOutlineReactPackage() {
  await exec(`rm -rf ./packages/outline-react/npm`);
  await exec(`mkdir ./packages/outline-react/npm`);
  await exec(
    `cp -R ./packages/outline-react/dist/*.js ./packages/outline-react/npm`,
  );
  await exec(
    `cp -R ./packages/outline-react/package.json ./packages/outline-react/npm`,
  );
  await exec(`cp -R LICENSE ./packages/outline-react/npm`);
  await exec(
    `cp -R ./packages/outline-react/README.md ./packages/outline-react/npm`,
  );
}

async function prepareOutlineYjsPackage() {
  await exec(`rm -rf ./packages/outline-yjs/npm`);
  await exec(`mkdir ./packages/outline-yjs/npm`);
  await exec(
    `cp -R ./packages/outline-yjs/dist/OutlineYjs.js ./packages/outline-yjs/npm/index.js`,
  );
  await exec(
    `cp -R ./packages/outline-yjs/package.json ./packages/outline-yjs/npm`,
  );
  await exec(`cp -R LICENSE ./packages/outline-yjs/npm`);
  await exec(
    `cp -R ./packages/outline-yjs/README.md ./packages/outline-yjs/npm`,
  );
}

prepareOutlinePackage();
prepareOutlineReactPackage();
prepareOutlineYjsPackage();
