/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {OutlineEditor} from 'outline';

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import {createEditor, BlockNode} from 'outline';
import {resetRandomKey} from '../../core/OutlineUtils';

type TestEnv = {
  editor: OutlineEditor | null,
  container: HTMLDivElement | null,
  outerHTML: string,
};

export const sanitizeHTML = (text) => {
  return text.replace(/[\u200B-\u200D\u2060\uFEFF]/g, '');
};

export const initializeUnitTest = (runTests: (testEnv: TestEnv) => void) => {
  const testEnv: TestEnv = {
    editor: null,
    container: null,
    get outerHTML() {
      return this.container.innerHTML.replace(
        /[\u200B-\u200D\u2060\uFEFF]/g,
        '',
      );
    },
  };

  beforeEach(async () => {
    resetRandomKey();

    testEnv.container = document.createElement('div');
    document.body.appendChild(testEnv.container);
    const ref = React.createRef();

    const useOutlineEditor = (rootElementRef) => {
      const outlineEditor = React.useMemo(() => {
        const outline = createEditor();
        outline.addListener('error', (error) => {
          throw error;
        });
        return outline;
      }, []);

      React.useEffect(() => {
        const rootElement = rootElementRef.current;
        outlineEditor.setRootElement(rootElement);
      }, [rootElementRef, outlineEditor]);
      return outlineEditor;
    };

    const Editor = () => {
      testEnv.editor = useOutlineEditor(ref);
      testEnv.editor.addListener('error', (error) => {
        throw error;
      });
      return <div ref={ref} contentEditable={true} />;
    };

    ReactTestUtils.act(() => {
      ReactDOM.createRoot(testEnv.container).render(<Editor />);
    });
  });

  afterEach(() => {
    document.body.removeChild(testEnv.container);
    testEnv.container = null;
  });

  runTests(testEnv);
};

export class TestBlockNode extends BlockNode {
  static clone(node: BlockNode) {
    return new TestBlockNode(node.__key);
  }
  createDOM() {
    return document.createElement('div');
  }
  updateDOM() {
    return false;
  }
}

export function createTestBlockNode(): TestBlockNode {
  return new TestBlockNode();
}
