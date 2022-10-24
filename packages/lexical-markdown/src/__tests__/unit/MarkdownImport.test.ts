/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// eslint-disable-next-line simple-import-sort/imports
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

import {$createTextNode, $getRoot} from 'lexical';
import {ImageNode} from './../../../../lexical-playground/src/nodes/ImageNode';
import {EquationNode} from './../../../../lexical-playground/src/nodes/EquationNode';
import {createMarkdownImport} from './../../MarkdownImport';
import {ELEMENT_TRANSFORMERS, TEXT_FORMAT_TRANSFORMERS} from './../..';
import {TextMatchTransformer, Transformer} from './../../MarkdownTransformers';

const URL =
  'https://design.agorapulse.com/assets/img/style/logos/logo-blue.svg';
const markdown = `First part of message then ![${URL}](${URL}) then an $equation$ in the middle of it, plus an image. ![${URL}](${URL}) ok?`;
const expectedTextContent =
  'First part of message then https://design.agorapulse.com/assets/img/style/logos/logo-blue.svg then an equation in the middle of it, plus an image. https://design.agorapulse.com/assets/img/style/logos/logo-blue.svg ok?';

const IMAGE: TextMatchTransformer = {
  dependencies: [ImageNode],
  export: (node, exportChildren, exportFormat) => {
    return `![${node.getAltText()}](${node.getSrc()})`;
  },
  importRegExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))/,
  regExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))$/,
  replace: (textNode, match) => {
    const [, , src] = match;
    const newTextNode = $createTextNode(src);
    textNode.replace(newTextNode);
  },
  trigger: ')',
  type: 'text-match',
};

const EQUATION: TextMatchTransformer = {
  dependencies: [EquationNode],
  export: (node, exportChildren, exportFormat) => {
    return `$${node.getEquation()}$`;
  },
  importRegExp: /\$([^$].+?)\$/,
  regExp: /\$([^$].+?)\$$/,
  replace: (textNode, match) => {
    const [, equation] = match;
    const equationNode = $createTextNode(equation);
    textNode.replace(equationNode);
  },
  trigger: '$',
  type: 'text-match',
};

const transformers: Array<Transformer> = [
  IMAGE,
  EQUATION,
  ...ELEMENT_TRANSFORMERS,
  ...TEXT_FORMAT_TRANSFORMERS,
];

describe('MarkdownImport tests', () => {
  initializeUnitTest(
    (testEnv) => {
      describe('convertFromMarkdownString', () => {
        let createMarkdownResult;

        test('createMarkdownImport', async () => {
          const {editor} = testEnv;

          await editor.update(() => {
            createMarkdownResult = createMarkdownImport(transformers);
          });
        });

        test('importMarkdown', async () => {
          const {editor} = testEnv;

          await editor.update(() => {
            createMarkdownResult(markdown);
            const root = $getRoot();
            const paragraph = root.getFirstChild();
            const textContent = paragraph.getTextContent();
            expect(textContent).toEqual(expectedTextContent);
          });
        });
      });
    },
    {
      namespace: '',
      nodes: [EquationNode, ImageNode],
      theme: {},
    },
  );
});
