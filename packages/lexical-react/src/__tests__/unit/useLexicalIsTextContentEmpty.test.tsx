/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalIsTextContentEmpty} from '@lexical/react/useLexicalIsTextContentEmpty';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  LexicalEditor,
  ParagraphNode,
} from 'lexical';
import * as React from 'react';
import {createRef} from 'react';
import {createRoot, Root} from 'react-dom/client';
import * as ReactTestUtils from 'shared/react-test-utils';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

describe('useLexicalIsTextContentEmpty', () => {
  let container: HTMLDivElement | null = null;
  let reactRoot: Root;

  beforeEach(() => {
    container = document.createElement('div');
    reactRoot = createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container!);
    container = null;

    vi.restoreAllMocks();
  });

  function useLexicalEditor(
    rootElementRef: React.RefObject<null | HTMLDivElement>,
  ) {
    const editor = React.useMemo(
      () =>
        createEditor({
          namespace: '',
          nodes: [ParagraphNode],
          onError: (err) => {
            throw err;
          },
        }),
      [],
    );

    React.useEffect(() => {
      const rootElement = rootElementRef.current;
      editor.setRootElement(rootElement);
    }, [rootElementRef, editor]);

    return editor;
  }

  test('hook works', async () => {
    const ref = createRef<null | HTMLDivElement>();
    let editor: LexicalEditor;
    let hasText = false;

    function TestBase() {
      editor = useLexicalEditor(ref);
      const isBlank = useLexicalIsTextContentEmpty(editor);

      expect(isBlank).toBe(!hasText);

      return <div ref={ref} contentEditable={true} />;
    }

    ReactTestUtils.act(() => {
      reactRoot.render(<TestBase />);
    });

    await ReactTestUtils.act(async () => {
      await editor.update(() => {
        const root = $getRoot();

        const paragraph = $createParagraphNode();
        const text = $createTextNode('foo');

        root.append(paragraph);
        paragraph.append(text);

        hasText = true;
      });
    });
  });
});
