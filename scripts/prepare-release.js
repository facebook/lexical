#!/usr/bin/env node

'use strict';

const {exec} = require('child-process-promise');
const fs = require('fs');
const path = require('path');

async function prepareLexicalCorePackage() {
  await exec(`rm -rf ./packages/lexical-core/npm`);
  await exec(`mkdir ./packages/lexical-core/npm`);
  await exec(`cp -R ./packages/lexical-core/dist/*.js ./packages/lexical-core/npm`);

  // Remap the node extensions to their short versions
  await exec(
    `mv ./packages/lexical-core/npm/LexicalCodeNode.js ./packages/lexical-core/npm/CodeNode.js`,
  );
  await exec(
    `mv ./packages/lexical-core/npm/LexicalParagraphNode.js ./packages/lexical-core/npm/ParagraphNode.js`,
  );
  await exec(
    `mv ./packages/lexical-core/npm/LexicalQuoteNode.js ./packages/lexical-core/npm/QuoteNode.js`,
  );
  await exec(
    `mv ./packages/lexical-core/npm/LexicalHashtagNode.js ./packages/lexical-core/npm/HashtagNode.js`,
  );
  await exec(
    `mv ./packages/lexical-core/npm/LexicalListNode.js ./packages/lexical-core/npm/ListNode.js`,
  );
  await exec(
    `mv ./packages/lexical-core/npm/LexicalListItemNode.js ./packages/lexical-core/npm/ListItemNode.js`,
  );

  await exec(
    `mv ./packages/lexical-core/npm/LexicalTableNode.js ./packages/lexical-core/npm/TableNode.js`,
  );
  await exec(
    `mv ./packages/lexical-core/npm/LexicalTableRowNode.js ./packages/lexical-core/npm/TableRowNode.js`,
  );
  await exec(
    `mv ./packages/lexical-core/npm/LexicalTableCellNode.js ./packages/lexical-core/npm/TableCellNode.js`,
  );

  await exec(
    `mv ./packages/lexical-core/npm/LexicalLinkNode.js ./packages/lexical-core/npm/LinkNode.js`,
  );
  await exec(
    `mv ./packages/lexical-core/npm/LexicalHeadingNode.js ./packages/lexical-core/npm/HeadingNode.js`,
  );
  // Other bits
  await exec(`cp -R ./packages/lexical-core/package.json ./packages/lexical-core/npm`);
  await exec(`cp -R LICENSE ./packages/lexical-core/npm`);
  await exec(`cp -R ./packages/lexical-core/README.md ./packages/lexical-core/npm`);
}

async function prepareLexicalHelpersPackage() {
  await exec(`rm -rf ./packages/lexical-helpers/npm`);
  await exec(`mkdir ./packages/lexical-helpers/npm`);
  await exec(`cp -R ./packages/lexical-helpers/dist/*.js ./packages/lexical-helpers/npm`);
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
    `mv ./packages/lexical-helpers/npm/LexicalFileHelpers.js ./packages/lexical-helpers/npm/file.js`,
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
    `mv ./packages/lexical-helpers/npm/LexicalRootHelpers.js ./packages/lexical-helpers/npm/validation.js`,
  );
  // Other bits
  await exec(`cp -R ./packages/lexical-helpers/package.json ./packages/lexical-helpers/npm`);
  await exec(`cp -R LICENSE ./packages/lexical-helpers/npm`);
  await exec(`cp -R ./packages/lexical-helpers/README.md ./packages/lexical-helpers/npm`);
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

prepareLexicalCorePackage();
prepareLexicalHelpersPackage();
prepareLexicalReactPackage();
prepareLexicalYjsPackage();
