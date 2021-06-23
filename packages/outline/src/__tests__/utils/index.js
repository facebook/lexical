/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import React from 'react';
import ReactDOM from 'react-dom';
import ReactTestUtils from 'react-dom/test-utils';

import {createEditor} from 'outline';
import {resetRandomKey} from '../../core/OutlineUtils';

import type {OutlineEditor} from 'outline';

type TestEnv = {
  editor: OutlineEditor | null,
  container: HTMLDivElement | null,
  outerHTML: string,
};

export const initializeUnitTest = (runTests: (testEnv: TestEnv) => void) => {
  const testEnv: TestEnv = {
    editor: null,
    container: null,
    get outerHTML() {
      return this.container.innerHTML.replace(/\uFEFF/g, '');
    },
  };

  beforeEach(async () => {
    resetRandomKey();

    testEnv.container = document.createElement('div');
    document.body.appendChild(testEnv.container);
    const ref = React.createRef();

    const useOutlineEditor = (editorElementRef) => {
      const outlineEditor = React.useMemo(() => {
        const outline = createEditor();
        outline.addErrorListener((error) => {
          throw error;
        });
        return outline;
      }, []);

      React.useEffect(() => {
        const editorElement = editorElementRef.current;
        outlineEditor.setEditorElement(editorElement);
      }, [editorElementRef, outlineEditor]);
      return outlineEditor;
    };

    const Editor = () => {
      testEnv.editor = useOutlineEditor(ref);
      testEnv.editor.addErrorListener((error) => {
        throw error;
      });
      return <div ref={ref} contentEditable={true} />;
    };

    ReactTestUtils.act(() => {
      ReactDOM.render(<Editor />, testEnv.container);
    });
  });

  afterEach(() => {
    document.body.removeChild(testEnv.container);
    testEnv.container = null;
  });

  runTests(testEnv);
};
