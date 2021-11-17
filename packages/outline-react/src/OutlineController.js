/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, EditorState, EditorThemeClasses} from 'outline';

import * as React from 'react';
import {createContext, useContext, useMemo} from 'react';
import {createEditor} from 'outline';
import invariant from 'shared/invariant';

type ControllerContext<Context> = null | [OutlineEditor, Context];

export type Controller<Context> = {
  ({children: React$Node}): React$Node,
  __context: React$Context<ControllerContext<Context>>,
};

export function createController<Context>(
  createControllerContext: () => Context,
  editorConfig?: {
    initialEditorState?: EditorState,
    theme?: EditorThemeClasses,
  },
): Controller<Context> {
  const ControlledContext = createContext<ControllerContext<Context>>(null);

  function ControllerComponent({children}) {
    const existingContext = useContext(ControlledContext);
    if (existingContext !== null) {
      invariant(
        false,
        'OutlineController\'s of the same type cannot be nested',
      );
    }
    const controllerContext = useMemo(() => {
      const context: Context = createControllerContext();
      const editor = createEditor<Context>({
        ...editorConfig,
        context,
      });
      return [editor, context];
    }, []);
    return (
      <ControlledContext.Provider value={controllerContext}>
        {children}
      </ControlledContext.Provider>
    );
  }
  ControllerComponent.__context = ControlledContext;

  return ControllerComponent;
}

export function useController<Context>(
  controller: Controller<Context>,
): [OutlineEditor, Context] {
  const context = useContext(controller.__context);
  if (context === null) {
    invariant(
      false,
      'OutlineController.useController: cannot find matching OutlineController',
    );
  }
  return context;
}
