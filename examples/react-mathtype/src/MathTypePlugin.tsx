/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MathTypeFormula} from './MathTypeData';
import type {MathTypeIntegrationInstance} from './MathTypeGlobals';
import type {LexicalEditor, NodeKey} from 'lexical';
import type {JSX, MutableRefObject} from 'react';

import '@wiris/mathtype-generic';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import {useCallback, useEffect, useRef} from 'react';

import {useMathTypeContext} from './MathTypeContext';
import {createFormulaFromImage} from './MathTypeData';
import {getWirisPlugin} from './MathTypeGlobals';
import {$createMathTypeNode, $isMathTypeNode} from './MathTypeNode';

type InsertFormulaResult = {
  focusElement: HTMLElement | Window;
  node: HTMLImageElement;
  windowTarget: Window;
};

function $commitFormula(
  nodeKey: NodeKey | null,
  formula: MathTypeFormula,
): void {
  if (nodeKey !== null) {
    const node = $getNodeByKey(nodeKey);
    if ($isMathTypeNode(node)) {
      node.setFormula(formula);
      return;
    }
  }

  const mathTypeNode = $createMathTypeNode(formula);
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    selection.insertNodes([mathTypeNode]);
    return;
  }

  $getRoot().append($createParagraphNode().append(mathTypeNode));
}

function createIntegration(
  editor: LexicalEditor,
  target: HTMLElement,
  toolbar: HTMLElement,
  pendingNodeKeyRef: MutableRefObject<NodeKey | null>,
): MathTypeIntegrationInstance {
  const wirisPlugin = getWirisPlugin();
  const integration = new wirisPlugin.GenericIntegration({
    target,
    toolbar,
  });
  wirisPlugin.currentInstance = integration;

  const openNewFormulaEditor =
    integration.openNewFormulaEditor.bind(integration);
  integration.openNewFormulaEditor = () => {
    pendingNodeKeyRef.current = null;
    wirisPlugin.currentInstance = integration;
    openNewFormulaEditor();
  };

  integration.insertFormula = (
    focusElement: HTMLElement | Window,
    windowTarget: Window,
    mathML: string,
    wirisProperties: null | object,
  ): InsertFormulaResult => {
    const image = wirisPlugin.Parser.mathmlToImgObject(
      document,
      mathML,
      wirisProperties,
    );
    const formula = createFormulaFromImage(image, mathML);
    const nodeKey = pendingNodeKeyRef.current;
    pendingNodeKeyRef.current = null;

    editor.update(() => {
      $commitFormula(nodeKey, formula);
    });

    integration.core.editionProperties.temporalImage = null;
    editor.focus();

    return {focusElement, node: image, windowTarget};
  };

  return integration;
}

export function MathTypePlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);
  const {integrationRef, pendingNodeKeyRef} = useMathTypeContext();

  const setRefs = useCallback(
    (toolbar: HTMLDivElement | null, target: HTMLDivElement | null) => {
      toolbarRef.current = toolbar;
      targetRef.current = target;
    },
    [],
  );

  useEffect(() => {
    const toolbar = toolbarRef.current;
    const target = targetRef.current;
    if (toolbar === null || target === null) {
      return;
    }

    const integration = createIntegration(
      editor,
      target,
      toolbar,
      pendingNodeKeyRef,
    );
    integration.init();
    integration.listeners.fire('onTargetReady', {});
    integrationRef.current = integration;

    return () => {
      if (integrationRef.current === integration) {
        integrationRef.current = null;
      }
      toolbar.textContent = '';
      integration.destroy();
    };
  }, [editor, integrationRef, pendingNodeKeyRef]);

  return (
    <>
      <div
        className="mathtype-toolbar"
        ref={toolbar => {
          setRefs(toolbar, targetRef.current);
        }}
      />
      <div
        aria-hidden="true"
        className="mathtype-target"
        contentEditable={true}
        ref={target => {
          setRefs(toolbarRef.current, target);
        }}
      />
    </>
  );
}
