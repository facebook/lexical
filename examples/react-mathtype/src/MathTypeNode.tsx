/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {MathTypeFormula} from './MathTypeData';
import type {
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  StateValueOrUpdater,
} from 'lexical';
import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalEditable} from '@lexical/react/useLexicalEditable';
import {useLexicalNodeSelection} from '@lexical/react/useLexicalNodeSelection';
import {
  $create,
  $getState,
  $setState,
  buildImportMap,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  createState,
  DecoratorNode,
} from 'lexical';
import {useCallback, useEffect} from 'react';

import {useMathTypeContext} from './MathTypeContext';
import {
  createFormulaFromImage,
  createImageFromFormula,
  encodeMathML,
  WIRIS_FORMULA_CLASS,
  WIRIS_MATHML_ATTRIBUTE,
} from './MathTypeData';

const mathMLState = /* @__PURE__ */ createState('mathML', {
  parse: value => (typeof value === 'string' ? value : ''),
});

const srcState = /* @__PURE__ */ createState('src', {
  parse: value => (typeof value === 'string' ? value : ''),
});

const altTextState = /* @__PURE__ */ createState('altText', {
  parse: value => (typeof value === 'string' ? value : ''),
});

const widthState = /* @__PURE__ */ createState('width', {
  parse: value => (typeof value === 'number' ? value : null),
});

const heightState = /* @__PURE__ */ createState('height', {
  parse: value => (typeof value === 'number' ? value : null),
});

const customEditorState = /* @__PURE__ */ createState('customEditor', {
  parse: value => (typeof value === 'string' ? value : null),
});

function $convertMathTypeImage(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  if (!(domNode instanceof HTMLImageElement)) {
    return null;
  }
  const hasWirisFormula =
    domNode.classList.contains(WIRIS_FORMULA_CLASS) ||
    domNode.hasAttribute(WIRIS_MATHML_ATTRIBUTE);
  if (!hasWirisFormula) {
    return null;
  }
  return {node: $createMathTypeNode(createFormulaFromImage(domNode))};
}

export class MathTypeNode extends DecoratorNode<JSX.Element> {
  $config() {
    return this.config('mathtype', {
      extends: DecoratorNode,
      importDOM: buildImportMap({
        img: domNode =>
          domNode instanceof HTMLImageElement &&
          (domNode.classList.contains(WIRIS_FORMULA_CLASS) ||
            domNode.hasAttribute(WIRIS_MATHML_ATTRIBUTE))
            ? {conversion: $convertMathTypeImage, priority: 3}
            : null,
      }),
      stateConfigs: [
        {flat: true, stateConfig: mathMLState},
        {flat: true, stateConfig: srcState},
        {flat: true, stateConfig: altTextState},
        {flat: true, stateConfig: widthState},
        {flat: true, stateConfig: heightState},
        {flat: true, stateConfig: customEditorState},
      ],
    });
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const element = document.createElement('span');
    element.className = 'editor-mathtype';
    return element;
  }

  updateDOM(): false {
    return false;
  }

  getFormula(): MathTypeFormula {
    return {
      altText: $getState(this, altTextState),
      customEditor: $getState(this, customEditorState),
      height: $getState(this, heightState),
      mathML: $getState(this, mathMLState),
      src: $getState(this, srcState),
      width: $getState(this, widthState),
    };
  }

  setFormula(formula: MathTypeFormula): this {
    return $setState(this, mathMLState, formula.mathML)
      .setSrc(formula.src)
      .setAltText(formula.altText)
      .setWidth(formula.width)
      .setHeight(formula.height)
      .setCustomEditor(formula.customEditor);
  }

  setSrc(valueOrUpdater: StateValueOrUpdater<typeof srcState>): this {
    return $setState(this, srcState, valueOrUpdater);
  }

  setAltText(valueOrUpdater: StateValueOrUpdater<typeof altTextState>): this {
    return $setState(this, altTextState, valueOrUpdater);
  }

  setWidth(valueOrUpdater: StateValueOrUpdater<typeof widthState>): this {
    return $setState(this, widthState, valueOrUpdater);
  }

  setHeight(valueOrUpdater: StateValueOrUpdater<typeof heightState>): this {
    return $setState(this, heightState, valueOrUpdater);
  }

  setCustomEditor(
    valueOrUpdater: StateValueOrUpdater<typeof customEditorState>,
  ): this {
    return $setState(this, customEditorState, valueOrUpdater);
  }

  exportDOM(): DOMExportOutput {
    return {element: createImageFromFormula(this.getFormula())};
  }

  getTextContent(): string {
    const formula = this.getFormula();
    return formula.altText || formula.mathML;
  }

  decorate(): JSX.Element {
    return (
      <MathTypeFormulaComponent
        formula={this.getFormula()}
        nodeKey={this.getKey()}
      />
    );
  }
}

export function $createMathTypeNode(formula: MathTypeFormula): MathTypeNode {
  return $create(MathTypeNode).setFormula(formula);
}

export function $isMathTypeNode(
  node: LexicalNode | null | undefined,
): node is MathTypeNode {
  return node instanceof MathTypeNode;
}

function MathTypeFormulaComponent({
  formula,
  nodeKey,
}: {
  formula: MathTypeFormula;
  nodeKey: NodeKey;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const isEditable = useLexicalEditable();
  const [isSelected, setSelected, clearSelection] =
    useLexicalNodeSelection(nodeKey);
  const {editFormula} = useMathTypeContext();

  const onClick = useCallback(
    (event: MouseEvent) => {
      const dom = editor.getElementByKey(nodeKey);
      if (dom === null || !dom.contains(event.target as Node)) {
        return false;
      }
      if (event.shiftKey) {
        setSelected(!isSelected);
      } else {
        clearSelection();
        setSelected(true);
      }
      return true;
    },
    [clearSelection, editor, isSelected, nodeKey, setSelected],
  );

  useEffect(() => {
    return editor.registerCommand(CLICK_COMMAND, onClick, COMMAND_PRIORITY_LOW);
  }, [editor, onClick]);

  useEffect(() => {
    const dom = editor.getElementByKey(nodeKey);
    if (dom === null) {
      return;
    }
    dom.classList.toggle('selected', isSelected && isEditable);
  }, [editor, isEditable, isSelected, nodeKey]);

  return (
    <img
      alt={formula.altText}
      className={WIRIS_FORMULA_CLASS}
      data-custom-editor={formula.customEditor ?? undefined}
      data-mathml={encodeMathML(formula.mathML)}
      draggable={false}
      height={formula.height ?? undefined}
      onDoubleClick={event => {
        event.preventDefault();
        if (isEditable) {
          editFormula(nodeKey, formula);
        }
      }}
      role="math"
      src={formula.src}
      title={isEditable ? 'Edit formula' : undefined}
      width={formula.width ?? undefined}
    />
  );
}
