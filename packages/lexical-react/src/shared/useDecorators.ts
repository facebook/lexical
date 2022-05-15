import type {LexicalEditor} from 'lexical';
import * as React from 'react';
import {useMemo, useState} from 'react';
// @ts-expect-error: Flow doesn't like this for some reason
import {createPortal, flushSync} from 'react-dom';
import useLayoutEffect from 'shared/useLayoutEffect';

export function useDecorators(editor: LexicalEditor): Array<React.Node> {
  const [decorators, setDecorators] = useState<{[string]: React.Node}>(() =>
    editor.getDecorators<React.Node>(),
  );
  // Subscribe to changes
  useLayoutEffect(() => {
    return editor.registerDecoratorListener((nextDecorators) => {
      flushSync(() => {
        setDecorators(nextDecorators);
      });
    });
  }, [editor]);
  // Return decorators defined as React Portals
  return useMemo(() => {
    const decoratedPortals = [];
    const decoratorKeys = Object.keys(decorators);

    for (let i = 0; i < decoratorKeys.length; i++) {
      const nodeKey = decoratorKeys[i];
      const reactDecorator = decorators[nodeKey];
      const element = editor.getElementByKey(nodeKey);

      if (element !== null) {
        decoratedPortals.push(createPortal(reactDecorator, element));
      }
    }

    return decoratedPortals;
  }, [decorators, editor]);
}