/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  LexicalComposerContext,
  type LexicalComposerContextWithEditor,
} from '@lexical/react/LexicalComposerContext';
import {Suspense, useMemo} from 'react';

import {type EditorComponentProps, type ReactConfig} from './types';
import {useReactDecorators} from './useReactDecorators';

/** @internal */
export function buildEditorComponent(
  config: ReactConfig,
  context: LexicalComposerContextWithEditor,
) {
  const [editor] = context;
  const rawConfigDecorators = config.decorators.map((El) =>
    // eslint-disable-next-line react/jsx-key -- wrapped later
    typeof El === 'function' ? <El context={context} /> : El,
  );
  return function EditorComponent(props: Partial<EditorComponentProps>) {
    const {
      EditorChildrenComponent = config.EditorChildrenComponent,
      ErrorBoundary = config.ErrorBoundary,
      contentEditable = config.contentEditable,
      children,
    } = props;
    const decorators = useReactDecorators(editor, ErrorBoundary);
    const configDecorators = useMemo(
      () =>
        rawConfigDecorators.map((decorator, i) => (
          <ErrorBoundary
            onError={(e) => {
              editor._onError(e);
            }}
            // eslint-disable-next-line react/no-array-index-key -- no natural key
            key={i}>
            <Suspense fallback={null}>{decorator}</Suspense>
          </ErrorBoundary>
        )),
      [ErrorBoundary],
    );
    return (
      <LexicalComposerContext.Provider value={context}>
        <EditorChildrenComponent
          context={context}
          contentEditable={contentEditable}>
          {children}
          {configDecorators}
          {decorators}
        </EditorChildrenComponent>
      </LexicalComposerContext.Provider>
    );
  };
}
