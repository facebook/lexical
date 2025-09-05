/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {$getRoot} from 'lexical';
import {
  expectHtmlToBeEqual,
  html,
  initializeUnitTest,
} from 'lexical/src/__tests__/utils';
import {beforeEach, describe, test} from 'vitest';

import {registerListStrictIndentTransform} from '../../index';

describe('Lexical List StrictIndentTransform tests', () => {
  initializeUnitTest((testEnv) => {
    beforeEach(() => {
      const {editor} = testEnv;
      registerListStrictIndentTransform(editor);
    });

    test('applyStrictListIndentation', async () => {
      const {editor} = testEnv;
      const parser = new DOMParser();

      const output = html`
        <ul>
          <li value="1">
            <span style="white-space: pre-wrap;">0</span>
          </li>
          <li value="2">
            <ul>
              <li value="1">
                <span style="white-space: pre-wrap;">1</span>
              </li>
              <li value="2">
                <ul>
                  <li value="1">
                    <span style="white-space: pre-wrap;">2</span>
                  </li>
                  <li value="2">
                    <ul>
                      <li value="1">
                        <span style="white-space: pre-wrap;">3</span>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      `;

      const cases: string[] = [
        html`
          <ul>
            <li>
              <span style="white-space: pre-wrap;">0</span>
            </li>
            <li>
              <ul>
                <li>
                  <ul>
                    <li>
                      <ul>
                        <li>
                          <!-- Indent: 3 -->
                          <span style="white-space: pre-wrap;">1</span>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </li>
                <li>
                  <ul>
                    <li>
                      <!-- Indent: 2 -->
                      <span style="white-space: pre-wrap;">2</span>
                    </li>
                    <li>
                      <ul>
                        <li>
                          <!-- Indent: 3 -->
                          <span style="white-space: pre-wrap;">3</span>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
        `,
        html`
          <ul>
            <li>
              <span style="white-space: pre-wrap;">0</span>
            </li>
            <li>
              <ul>
                <li>
                  <ul>
                    <li>
                      <!-- Indent: 2 -->
                      <span style="white-space: pre-wrap;">1</span>
                    </li>
                  </ul>
                </li>
                <li>
                  <ul>
                    <li>
                      <ul>
                        <li>
                          <ul>
                            <li>
                              <!-- Indent: 4 -->
                              <span style="white-space: pre-wrap;">2</span>
                            </li>
                          </ul>
                        </li>
                      </ul>
                    </li>
                    <li>
                      <ul>
                        <li>
                          <!-- Indent: 3 -->
                          <span style="white-space: pre-wrap;">3</span>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
        `,
        html`
          <ul>
            <li>
              <span style="white-space: pre-wrap;">0</span>
            </li>
            <li>
              <ul>
                <li>
                  <ul>
                    <li>
                      <!-- Indent: 2 -->
                      <span style="white-space: pre-wrap;">1</span>
                    </li>
                  </ul>
                </li>
                <li>
                  <ul>
                    <li>
                      <ul>
                        <li>
                          <ul>
                            <li>
                              <!-- Indent: 4 -->
                              <span style="white-space: pre-wrap;">2</span>
                            </li>
                          </ul>
                        </li>
                      </ul>
                    </li>
                    <li>
                      <ul>
                        <li>
                          <ul>
                            <li>
                              <ul>
                                <li>
                                  <!-- Indent: 5 -->
                                  <span style="white-space: pre-wrap;">3</span>
                                </li>
                              </ul>
                            </li>
                          </ul>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
        `,
      ];

      for (const input of cases) {
        await editor.update(() => {
          const root = $getRoot();
          root.clear();

          const dom = parser.parseFromString(input, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          root.append(...nodes);
        });

        editor.read(() => {
          expectHtmlToBeEqual($generateHtmlFromNodes(editor), output);
        });
      }
    });
  });
});
