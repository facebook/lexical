#!/usr/bin/env node

'use strict';

const {exec} = require('child-process-promise');
const fs = require('fs');
const path = require('path');

async function prepareLexicalPackage() {
  await exec(`rm -rf ./packages/lexical/npm`);
  await exec(`mkdir ./packages/lexical/npm`);
  await exec(`cp -R ./packages/lexical/dist/*.js ./packages/lexical/npm`);
  // Remap the helper packages to their short versions
  await exec(
    `mv ./packages/lexical/npm/LexicalSelectionHelpers.js ./packages/lexical/npm/selection.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalTextHelpers.js ./packages/lexical/npm/text.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalEventHelpers.js ./packages/lexical/npm/events.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalOffsetHelpers.js ./packages/lexical/npm/offsets.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalNodeHelpers.js ./packages/lexical/npm/nodes.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalElementHelpers.js ./packages/lexical/npm/elements.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalRootHelpers.js ./packages/lexical/npm/validation.js`,
  );
  // Remap the node extensions to their short versions
  await exec(
    `mv ./packages/lexical/npm/LexicalCodeNode.js ./packages/lexical/npm/CodeNode.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalParagraphNode.js ./packages/lexical/npm/ParagraphNode.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalQuoteNode.js ./packages/lexical/npm/QuoteNode.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalHashtagNode.js ./packages/lexical/npm/HashtagNode.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalListNode.js ./packages/lexical/npm/ListNode.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalListItemNode.js ./packages/lexical/npm/ListItemNode.js`,
  );

  await exec(
    `mv ./packages/lexical/npm/LexicalTableNode.js ./packages/lexical/npm/TableNode.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalTableRowNode.js ./packages/lexical/npm/TableRowNode.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalTableCellNode.js ./packages/lexical/npm/TableCellNode.js`,
  );

  await exec(
    `mv ./packages/lexical/npm/LexicalLinkNode.js ./packages/lexical/npm/LinkNode.js`,
  );
  await exec(
    `mv ./packages/lexical/npm/LexicalHeadingNode.js ./packages/lexical/npm/HeadingNode.js`,
  );
  // Other bits
  await exec(`cp -R ./packages/lexical/package.json ./packages/lexical/npm`);
  await exec(`cp -R LICENSE ./packages/lexical/npm`);
  await exec(`cp -R ./packages/lexical/README.md ./packages/lexical/npm`);
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

prepareLexicalPackage();
prepareLexicalReactPackage();
prepareLexicalYjsPackage();
