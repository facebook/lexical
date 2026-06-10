/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX, KeyboardEvent, Ref} from 'react';

import './EquationEditor.css';

import {ChangeEvent, forwardRef, useCallback, useRef} from 'react';

import KatexRenderer from './KatexRenderer';

type BaseEquationEditorProps = {
  equation: string;
  inline: boolean;
  setEquation: (equation: string) => void;
  onDeleteEmpty?: () => void;
  showPreview?: boolean;
};

type EquationEditorInput = HTMLInputElement | HTMLTextAreaElement;

type EquationSnippet = Readonly<{
  label: string;
  latex: string;
  title: string;
}>;

type EquationTemplate = Readonly<{
  getInsert: (selection: string) => {
    latex: string;
    selectionEnd: number;
    selectionStart: number;
  };
  label: string;
  title: string;
}>;

const SYMBOL_GROUPS: ReadonlyArray<
  Readonly<{
    label: string;
    symbols: ReadonlyArray<EquationSnippet>;
  }>
> = [
  {
    label: 'Greek',
    symbols: [
      {label: 'α', latex: '\\alpha', title: 'Insert alpha'},
      {label: 'β', latex: '\\beta', title: 'Insert beta'},
      {label: 'γ', latex: '\\gamma', title: 'Insert gamma'},
      {label: 'π', latex: '\\pi', title: 'Insert pi'},
      {label: 'θ', latex: '\\theta', title: 'Insert theta'},
      {label: 'λ', latex: '\\lambda', title: 'Insert lambda'},
    ],
  },
  {
    label: 'Operators',
    symbols: [
      {label: 'Σ', latex: '\\sum', title: 'Insert summation'},
      {label: 'Π', latex: '\\prod', title: 'Insert product'},
      {label: '∫', latex: '\\int', title: 'Insert integral'},
      {label: '√', latex: '\\sqrt{}', title: 'Insert square root'},
      {label: 'lim', latex: '\\lim', title: 'Insert limit'},
      {label: '∂', latex: '\\partial', title: 'Insert partial derivative'},
    ],
  },
  {
    label: 'Relations',
    symbols: [
      {label: '≤', latex: '\\leq', title: 'Insert less than or equal'},
      {label: '≥', latex: '\\geq', title: 'Insert greater than or equal'},
      {label: '≠', latex: '\\neq', title: 'Insert not equal'},
      {label: '≈', latex: '\\approx', title: 'Insert approximately equal'},
      {label: '∈', latex: '\\in', title: 'Insert set membership'},
      {label: '→', latex: '\\rightarrow', title: 'Insert right arrow'},
    ],
  },
];

const EQUATION_TEMPLATES: ReadonlyArray<EquationTemplate> = [
  {
    getInsert: selection => {
      const numerator = selection || 'a';
      return {
        latex: `\\frac{${numerator}}{b}`,
        selectionEnd: selection ? `\\frac{${numerator}}{b}`.length : 7,
        selectionStart: selection ? `\\frac{${numerator}}{b}`.length : 6,
      };
    },
    label: 'Fraction',
    title: 'Insert fraction (Ctrl+Shift+F)',
  },
  {
    getInsert: selection => {
      const radicand = selection || 'x';
      return {
        latex: `\\sqrt{${radicand}}`,
        selectionEnd: selection ? `\\sqrt{${radicand}}`.length : 7,
        selectionStart: selection ? `\\sqrt{${radicand}}`.length : 6,
      };
    },
    label: 'Root',
    title: 'Insert square root (Ctrl+Shift+R)',
  },
  {
    getInsert: selection => {
      const base = selection || 'x';
      return {
        latex: `${base}^{2}`,
        selectionEnd: selection ? `${base}^{2}`.length : 1,
        selectionStart: selection ? `${base}^{2}`.length : 0,
      };
    },
    label: 'Power',
    title: 'Insert exponent',
  },
  {
    getInsert: selection => {
      const integrand = selection || 'f(x)';
      const latex = `\\int_{a}^{b} ${integrand}\\,dx`;
      return {
        latex,
        selectionEnd: selection ? latex.length : 15 + integrand.length,
        selectionStart: selection ? latex.length : 15,
      };
    },
    label: 'Integral',
    title: 'Insert definite integral',
  },
  {
    getInsert: () => {
      const latex = '\\begin{bmatrix}\na & b \\\\\nc & d\n\\end{bmatrix}';
      return {
        latex,
        selectionEnd: 17,
        selectionStart: 16,
      };
    },
    label: 'Matrix',
    title: 'Insert matrix (Ctrl+Shift+M)',
  },
];

function EquationEditor(
  {
    equation,
    setEquation,
    inline,
    onDeleteEmpty,
    showPreview = true,
  }: BaseEquationEditorProps,
  forwardedRef: Ref<EquationEditorInput>,
): JSX.Element {
  const inputRef = useRef<EquationEditorInput | null>(null);

  const setInputRef = useCallback(
    (input: EquationEditorInput | null) => {
      inputRef.current = input;
      if (typeof forwardedRef === 'function') {
        forwardedRef(input);
      } else if (forwardedRef !== null) {
        forwardedRef.current = input;
      }
    },
    [forwardedRef],
  );

  const onChange = (event: ChangeEvent) => {
    setEquation((event.target as HTMLInputElement).value);
  };

  const insertLatex = useCallback(
    (
      latex: string,
      selectionStart: number = latex.length,
      selectionEnd = selectionStart,
    ) => {
      const input = inputRef.current;
      const start = input?.selectionStart ?? equation.length;
      const end = input?.selectionEnd ?? start;
      const nextEquation =
        equation.slice(0, start) + latex + equation.slice(end);
      setEquation(nextEquation);

      requestAnimationFrame(() => {
        const currentInput = inputRef.current;
        if (currentInput === null) {
          return;
        }
        currentInput.focus();
        currentInput.setSelectionRange(
          start + selectionStart,
          start + selectionEnd,
        );
      });
    },
    [equation, setEquation],
  );

  const insertTemplate = useCallback(
    (template: EquationTemplate) => {
      const input = inputRef.current;
      const start = input?.selectionStart ?? equation.length;
      const end = input?.selectionEnd ?? start;
      const selectedEquation = equation.slice(start, end);
      const {latex, selectionStart, selectionEnd} =
        template.getInsert(selectedEquation);
      insertLatex(latex, selectionStart, selectionEnd);
    },
    [equation, insertLatex],
  );

  // Backspace inside an already-empty editor removes the host
  // EquationNode entirely, mirroring how users normally collapse a
  // node by pressing Backspace at its start.
  const onKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (event.key === 'Backspace' && equation === '' && onDeleteEmpty) {
      event.preventDefault();
      onDeleteEmpty();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
      const key = event.key.toLowerCase();
      const shortcutTemplate =
        key === 'f'
          ? EQUATION_TEMPLATES[0]
          : key === 'r'
            ? EQUATION_TEMPLATES[1]
            : key === 'm'
              ? EQUATION_TEMPLATES[4]
              : null;
      if (shortcutTemplate !== null) {
        event.preventDefault();
        insertTemplate(shortcutTemplate);
      }
    }
  };

  const input = inline ? (
    <span className="EquationEditor_inputBackground">
      <span className="EquationEditor_dollarSign">$</span>
      <input
        autoFocus={true}
        className="EquationEditor_inlineEditor"
        data-test-id="equation-input"
        onChange={onChange}
        onKeyDown={onKeyDown}
        ref={setInputRef}
        value={equation}
      />
      <span className="EquationEditor_dollarSign">$</span>
    </span>
  ) : (
    <span className="EquationEditor_inputBackground">
      <span className="EquationEditor_dollarSign">{'$$\n'}</span>
      <textarea
        className="EquationEditor_blockEditor"
        data-test-id="equation-input"
        onChange={onChange}
        onKeyDown={onKeyDown}
        ref={setInputRef}
        value={equation}
      />
      <span className="EquationEditor_dollarSign">{'\n$$'}</span>
    </span>
  );

  const editor = (
    <>
      <span className="EquationEditor_toolbar" aria-label="Equation templates">
        {EQUATION_TEMPLATES.map(template => (
          <button
            className="EquationEditor_templateButton"
            data-test-id={`equation-template-${template.label.toLowerCase()}`}
            key={template.label}
            onClick={() => {
              insertTemplate(template);
            }}
            onMouseDown={event => {
              event.preventDefault();
            }}
            title={template.title}
            type="button">
            {template.label}
          </button>
        ))}
      </span>
      <span className="EquationEditor_symbolPalette">
        {SYMBOL_GROUPS.map(group => (
          <span className="EquationEditor_symbolGroup" key={group.label}>
            <span className="EquationEditor_symbolGroupLabel">
              {group.label}
            </span>
            <span className="EquationEditor_symbolButtons">
              {group.symbols.map(symbol => (
                <button
                  className="EquationEditor_symbolButton"
                  data-test-id={`equation-symbol-${symbol.latex.slice(1)}`}
                  key={symbol.latex}
                  onClick={() => {
                    insertLatex(symbol.latex);
                  }}
                  onMouseDown={event => {
                    event.preventDefault();
                  }}
                  title={symbol.title}
                  type="button">
                  {symbol.label}
                </button>
              ))}
            </span>
          </span>
        ))}
      </span>
      {input}
      {showPreview ? (
        <span
          className="EquationEditor_preview"
          data-test-id="equation-preview">
          <KatexRenderer
            equation={equation}
            inline={inline}
            onDoubleClick={() => null}
          />
        </span>
      ) : null}
    </>
  );

  return inline ? (
    <span className="EquationEditor_root EquationEditor_rootInline">
      {editor}
    </span>
  ) : (
    <div className="EquationEditor_root EquationEditor_rootBlock">{editor}</div>
  );
}

export default forwardRef(EquationEditor);
