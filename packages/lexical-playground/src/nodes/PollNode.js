/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalNode, DecoratorMap, NodeKey, LexicalEditor} from 'lexical';

import {DecoratorNode, createDecoratorArray, createDecoratorMap} from 'lexical';
import * as React from 'react';
import {useRef} from 'react';
import useLexicalDecoratorMap from '@lexical/react/useLexicalDecoratorMap';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import stylex from 'stylex';
import {useClientIDContext} from '../context/ClientIDContext';

const styles = stylex.create({
  container: {
    border: '1px solid #eee',
    backgroundColor: '#fcfcfc',
    padding: 15,
    borderRadius: 10,
    maxWidth: 600,
  },
  heading: {
    marginLeft: 0,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 15,
    color: '#444',
    textAlign: 'center',
    fontSize: 18,
  },
  optionContainer: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  optionInputWrapper: {
    display: 'flex',
    flex: 10,
    border: '1px solid rgb(61,135,245)',
    borderRadius: 5,
  },
  optionInput: {
    display: 'flex',
    flex: 1,
    border: 0,
    padding: 7,
    borderRadius: 5,
    color: 'rgb(61,135,245)',
    fontWeight: 'bold',
    outline: 0,
    '::placeholder': {
      fontWeight: 'normal',
      color: '#999',
    },
  },
  optionCheckboxWrapper: {
    position: 'relative',
    display: 'flex',
    width: 22,
    height: 22,
    border: '1px solid #999',
    marginRight: 10,
    borderRadius: 5,
    cursor: 'pointer',
  },
  optionCheckboxChecked: {
    border: '1px solid rgb(61,135,245)',
    backgroundColor: 'rgb(61,135,245)',
    backgroundPosition: '3px 3px',
    backgroundRepeat: 'no-repeat',
  },
  optionCheckbox: {
    border: 0,
    position: 'absolute',
    display: 'block',
    width: 0,
    height: 0,
    opacity: 0,
  },
});

function createUID(): string {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .substr(0, 5);
}

function createPollOptionMap(
  editor: LexicalEditor,
  text: string,
): DecoratorMap {
  return createDecoratorMap(
    editor,
    new Map([
      ['text', text],
      ['uid', createUID()],
      ['votes', createDecoratorArray(editor)],
    ]),
  );
}

function PollOptionComponent({
  editor,
  decoratorMap,
  index,
}: {
  editor: LexicalEditor,
  decoratorMap: DecoratorMap,
  index: number,
}): React$Node {
  const clientID = useClientIDContext();
  const [text, setText] = useLexicalDecoratorMap(decoratorMap, 'text', '');
  const [votes] = useLexicalDecoratorMap(decoratorMap, 'votes', () =>
    createDecoratorArray(editor),
  );
  const checkboxRef = useRef(null);
  const checkedIndex = votes.indexOf(clientID);
  const checked = checkedIndex !== -1;

  return (
    <div className={stylex(styles.optionContainer)}>
      <div
        className={stylex(
          styles.optionCheckboxWrapper,
          checked && styles.optionCheckboxChecked,
        )}
        onClick={() => {
          const checkbox = checkboxRef.current;
          if (checkbox !== null) {
            checkbox.click();
          }
        }}>
        <input
          ref={checkboxRef}
          className={stylex(styles.optionCheckbox)}
          type="checkbox"
          onChange={(e) => {
            if (checked) {
              votes.splice(checkedIndex, 1);
            } else {
              votes.push(clientID);
            }
          }}
          checked={checked}
        />
      </div>
      <div className={stylex(styles.optionInputWrapper)}>
        <input
          className={stylex(styles.optionInput)}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Option ${index + 1}`}
        />
      </div>
    </div>
  );
}

function PollComponent({
  decoratorMap,
  question,
}: {
  decoratorMap: DecoratorMap,
  question: string,
}): React$Node {
  const [editor] = useLexicalComposerContext();
  const [options] = useLexicalDecoratorMap(decoratorMap, 'options', () =>
    createDecoratorArray(editor, [
      createPollOptionMap(editor, ''),
      createPollOptionMap(editor, ''),
    ]),
  );

  return (
    <div className={stylex(styles.container)}>
      <h2 className={stylex(styles.heading)}>{question}</h2>
      {options.map((option, index) => {
        // $FlowFixMe: need to revise type
        const key: string = option.get('uid');
        // $FlowFixMe: need to revise type
        const decoratorMap: DecoratorMap = option;
        return (
          <PollOptionComponent
            editor={editor}
            key={key}
            decoratorMap={decoratorMap}
            index={index}
          />
        );
      })}
    </div>
  );
}

export class PollNode extends DecoratorNode {
  __question: string;

  static getType(): string {
    return 'poll';
  }

  static clone(node: PollNode): PollNode {
    return new PollNode(node.__question, node.__state, node.__key);
  }

  constructor(question: string, state?: DecoratorMap, key?: NodeKey) {
    super(state, key);
    this.__question = question;
  }

  createDOM(): HTMLElement {
    return document.createElement('div');
  }

  updateDOM(): false {
    return false;
  }

  decorate(): React$Node {
    return (
      <PollComponent question={this.__question} decoratorMap={this.__state} />
    );
  }
}

export function $createPollNode(question: string): PollNode {
  return new PollNode(question);
}

export function $isPollNode(node: ?LexicalNode): boolean %checks {
  return node instanceof PollNode;
}
