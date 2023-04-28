/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './CodeBlockComponent.css';

import {Compartment, EditorState, Extension} from '@codemirror/state';
import {EditorView, ViewUpdate} from '@codemirror/view';
import {BlockWithAlignableContents} from '@lexical/react/LexicalBlockWithAlignableContents';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {basicSetup} from 'codemirror';
import {$getNodeByKey, ElementFormatType, NodeKey} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import DropDown, {DropDownItem} from '../../ui/DropDown';
import {$isCodeBlockNode, CodeBlockMode} from './index';
import {getModeLoader} from './loader';
import {modes} from './modes';
import {useDebounce} from './utils';

type CodeBlockComponentProps = Readonly<{
  className: Readonly<{
    base: string;
    focus: string;
  }>;
  format: ElementFormatType | null;
  nodeKey: NodeKey;
  code: string;
  mode: CodeBlockMode;
}>;

export default function CodeBlockComponent({
  code,
  format,
  mode: initialMode,
  className,
  nodeKey,
}: CodeBlockComponentProps): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const ref = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const hasFired = useRef<boolean>(false);
  const readOnlyRef = useRef<boolean>(!editor.isEditable());
  const [copying, setCopying] = useState<boolean>(false);
  const [wrap, setWrap] = useState<boolean>(false);
  const [mode, setMode] = useState<CodeBlockMode>(initialMode || 'none');

  const removeSuccessIcon = useDebounce(() => {
    setCopying(false);
  }, 1000);

  const langCompartment = useMemo(() => new Compartment(), []);
  const wrapCompartment = useMemo(() => new Compartment(), []);

  const updateCode = useCallback(
    (latest: string) =>
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isCodeBlockNode(node)) {
          node.setCode(latest);
        }
      }),
    [editor, nodeKey],
  );

  const updateMode = useCallback(
    (latest: CodeBlockMode) =>
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isCodeBlockNode(node)) {
          node.setMode(latest);
        }
      }),
    [editor, nodeKey],
  );

  const changeMode = useCallback(
    (newMode: CodeBlockMode) => {
      updateMode(newMode);
      setMode(newMode);

      if (newMode !== 'none') {
        getModeLoader(newMode)
          .then((loader) => {
            if (viewRef.current) {
              viewRef.current.dispatch({
                effects: langCompartment.reconfigure(loader()),
              });
            }
          })
          .catch((err) => {
            alert('Unable to load the language');
            console.error('Failed to load the mode: ', err);
          });
      }
    },
    [langCompartment, updateMode],
  );

  const toggleWrap = useCallback(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: wrapCompartment.reconfigure(
          wrap ? [] : EditorView.lineWrapping,
        ),
      });
    }

    setWrap((prevState) => !prevState);
  }, [wrap, wrapCompartment]);

  const handleCopy = useCallback(async () => {
    if (viewRef.current?.state) {
      const content = viewRef.current.state.doc.toString() || '';

      try {
        await navigator.clipboard.writeText(content);
        setCopying(true);
        removeSuccessIcon();
      } catch (err) {
        alert('Failed to copy');
        console.error('Failed to copy: ', err);
      }
    }
  }, [removeSuccessIcon]);

  useEffect(() => {
    // prevent effect from firing twice on dev
    // TODO: this sometimes fires twice, seems like a vite issue
    if (hasFired.current) return;
    hasFired.current = true;

    (async () => {
      const loader = await getModeLoader(mode);

      const extensions: Extension[] = [
        basicSetup,
        langCompartment.of(loader()),
        wrapCompartment.of([]),
      ];

      if (readOnlyRef.current) {
        extensions.push(
          // read-only code block
          ...[EditorState.readOnly.of(true), EditorView.editable.of(false)],
        );
      } else {
        extensions.push(
          EditorView.updateListener.of((update: ViewUpdate) => {
            if (update.focusChanged) {
              if (update.view.hasFocus) {
                // disable editor when the code block is focused
                // disabling the editor triggers the root event listener and
                // eventually conflicts with LexicalClickableLinkPlugin
                // editor.setEditable(false);
              } else if (
                document.activeElement &&
                // handle the direct focus jump from one code editor block to another code editor block
                !document.activeElement.classList.contains('cm-content')
              ) {
                // TODO: uncomment after fixing LexicalClickableLinkPlugin
                // editor.setEditable(true);
              }
            } else if (update.docChanged) {
              const {doc} = update.view.state.toJSON() || {};
              updateCode(doc || '');
            }
          }),
        );
      }

      const state = EditorState.create({
        doc: code,
        extensions,
      });

      viewRef.current = new EditorView({
        parent: ref.current as HTMLDivElement,
        state,
      });
    })();
  }, [code, langCompartment, mode, updateCode, wrapCompartment]);

  return (
    <BlockWithAlignableContents
      className={className}
      format={format}
      nodeKey={nodeKey}>
      <div className={'code-block-toolbar'}>
        {/* TODO: refactor this quick temporary dropdown extracted from ToolbarPlugin */}
        <DropDown
          buttonClassName="toolbar-item code-language"
          buttonLabel={modes[mode as keyof typeof modes] || 'None'}
          buttonAriaLabel="Select language">
          {Object.entries({none: 'None', ...modes}).map(([key, label]) => (
            <DropDownItem
              className={`item ${
                key === mode ? 'active dropdown-item-active' : ''
              }`}
              onClick={() => changeMode(key as CodeBlockMode)}
              key={key}>
              <span className="text">{label}</span>
            </DropDownItem>
          ))}
        </DropDown>
        <div className={'toolbar-spacer'} />
        <button className="menu-item" onClick={handleCopy} aria-label="copy">
          {copying ? 'Copied to clipboard' : 'Copy'}
        </button>
        <button
          className="menu-item"
          onClick={toggleWrap}
          aria-label="wrap lines">
          {wrap ? 'Unwrap code lines' : 'Wrap code lines'}
        </button>
      </div>
      <div className={'code-block'} ref={ref} />
    </BlockWithAlignableContents>
  );
}
