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
import {createContext, useContext} from 'react';
import {createEditor} from 'outline';
import invariant from 'shared/invariant';

type ControllerContext<Contract> = null | [OutlineEditor, Contract];

export type Controller<Contract> = {
  ({children: React$Node}): React$Node,
  __context: React$Context<ControllerContext<Contract>>,
};

export function createController<Contract>(
  createContract: () => Contract,
  editorConfig?: {
    initialEditorState?: EditorState,
    theme?: EditorThemeClasses,
  },
): Controller<Contract> {
  const contract: Contract = createContract();
  const editor = createEditor<Contract>({
    ...editorConfig,
    contract,
  });
  const controllerContext = [editor, contract];
  const ControlledContext = createContext<ControllerContext<Contract>>(null);

  function ControllerComponent({children}) {
    return (
      <ControlledContext.Provider value={controllerContext}>
        {children}
      </ControlledContext.Provider>
    );
  }
  ControllerComponent.__context = ControlledContext;

  return ControllerComponent;
}

export function useController<Contract>(
  controller: Controller<Contract>,
): [OutlineEditor, Contract] {
  const context = useContext(controller.__context);
  if (context === null) {
    invariant(
      false,
      'OutlineController.useController: cannot find matching OutlineController',
    );
  }
  return context;
}
