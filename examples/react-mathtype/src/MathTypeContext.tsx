/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MathTypeFormula} from './MathTypeData';
import type {MathTypeIntegrationInstance} from './MathTypeGlobals';
import type {NodeKey} from 'lexical';
import type {JSX, MutableRefObject, PropsWithChildren} from 'react';

import {createContext, useCallback, useContext, useMemo, useRef} from 'react';

import {createImageFromFormula} from './MathTypeData';

type MathTypeContextValue = {
  editFormula: (nodeKey: NodeKey, formula: MathTypeFormula) => boolean;
  integrationRef: MutableRefObject<MathTypeIntegrationInstance | null>;
  pendingNodeKeyRef: MutableRefObject<NodeKey | null>;
};

const MathTypeContext = createContext<MathTypeContextValue | null>(null);

export function MathTypeProvider({children}: PropsWithChildren): JSX.Element {
  const integrationRef = useRef<MathTypeIntegrationInstance | null>(null);
  const pendingNodeKeyRef = useRef<NodeKey | null>(null);

  const editFormula = useCallback(
    (nodeKey: NodeKey, formula: MathTypeFormula): boolean => {
      const integration = integrationRef.current;
      if (integration === null) {
        return false;
      }
      pendingNodeKeyRef.current = nodeKey;
      const temporalImage = createImageFromFormula(formula);
      integration.core.editionProperties.temporalImage = temporalImage;
      integration.core.editionProperties.dbclick = true;
      integration.core.editionProperties.isNewElement = false;

      const customEditors = integration.core.getCustomEditors();
      customEditors.disable();
      if (formula.customEditor !== null) {
        customEditors.enable(formula.customEditor);
      }

      integration.openExistingFormulaEditor();
      return true;
    },
    [],
  );

  const value = useMemo(
    () => ({
      editFormula,
      integrationRef,
      pendingNodeKeyRef,
    }),
    [editFormula],
  );

  return (
    <MathTypeContext.Provider value={value}>
      {children}
    </MathTypeContext.Provider>
  );
}

export function useMathTypeContext(): MathTypeContextValue {
  const context = useContext(MathTypeContext);
  if (context === null) {
    throw new Error(
      'MathType components must be rendered inside MathTypeProvider.',
    );
  }
  return context;
}
