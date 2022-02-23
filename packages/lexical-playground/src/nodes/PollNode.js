/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  LexicalNode,
  DecoratorArray,
  DecoratorMap,
  NodeKey,
  LexicalEditor,
} from 'lexical';

import {DecoratorNode, createDecoratorArray, createDecoratorMap} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';
import useLexicalDecoratorMap from '@lexical/react/useLexicalDecoratorMap';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useCollaborationContext} from '@lexical/react/LexicalCollaborationPlugin';
import stylex from 'stylex';
import Button from '../ui/Button';

const styles = stylex.create({
  container: {
    border: '1px solid #eee',
    backgroundColor: '#fcfcfc',
    padding: 15,
    borderRadius: 10,
    maxWidth: 600,
    minWidth: 400,
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
    position: 'relative',
    overflow: 'hidden',
  },
  optionInput: {
    display: 'flex',
    flex: 1,
    border: 0,
    padding: 7,
    color: 'rgb(61,135,245)',
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    outline: 0,
    '::placeholder': {
      fontWeight: 'normal',
      color: '#999',
    },
    zIndex: 0,
  },
  optionInputVotes: {
    backgroundColor: 'rgb(236, 243, 254)',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    transition: 'width 1s ease',
    zIndex: 0,
  },
  optionInputVotesCount: {
    color: 'rgb(61,135,245)',
    position: 'absolute',
    right: 15,
    fontSize: 12,
    top: 5,
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
  optionDelete: {
    display: 'flex',
    width: 28,
    height: 28,
    marginLeft: 6,
    border: 0,
    backgroundColor: 'transparent',
    backgroundPosition: '6px 6px',
    backgroundRepeat: 'no-repeat',
    zIndex: 0,
    cursor: 'pointer',
    borderRadius: 5,
    opacity: 0.3,
    ':hover': {
      opacity: 1,
      backgroundColor: '#eee',
    },
  },
  optionDeleteDisabled: {
    cursor: 'not-allowed',
    ':hover': {
      opacity: 0.3,
      backgroundColor: 'transparent',
    },
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
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

function getTotalVotes(options: DecoratorArray): number {
  // $FlowFixMe: need to revise type
  const votes: number = options.reduce((totalVotes, next) => {
    // $FlowFixMe: need to revise type
    return totalVotes + next.get('votes').getLength();
  }, 0);

  return votes;
}

function PollOptionComponent({
  editor,
  decoratorMap,
  index,
  options,
  totalVotes,
  updateTotalVotes,
}: {
  editor: LexicalEditor,
  decoratorMap: DecoratorMap,
  index: number,
  options: DecoratorArray,
  totalVotes: number,
  updateTotalVotes: () => void,
}): React$Node {
  // TODO we should try and avoid pulling in collab here
  const {clientID} = useCollaborationContext();
  const [text, setText] = useLexicalDecoratorMap(decoratorMap, 'text', '');
  const [votesArray] = useLexicalDecoratorMap(decoratorMap, 'votes', () =>
    createDecoratorArray(editor),
  );
  const checkboxRef = useRef(null);
  const checkedIndex = votesArray.indexOf(clientID);
  const checked = checkedIndex !== -1;
  const votes = votesArray.getLength();

  useEffect(() => {
    return votesArray.observe(() => {
      updateTotalVotes();
    });
  }, [updateTotalVotes, votesArray]);

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
              votesArray.splice(checkedIndex, 1);
            } else {
              votesArray.push(clientID);
            }
          }}
          checked={checked}
        />
      </div>
      <div className={stylex(styles.optionInputWrapper)}>
        <div
          className={stylex(styles.optionInputVotes)}
          style={{width: `${votes === 0 ? 0 : (votes / totalVotes) * 100}%`}}
        />
        <span className={stylex(styles.optionInputVotesCount)}>
          {votes > 0 && (votes === 1 ? '1 vote' : `${votes} votes`)}
        </span>
        <input
          className={stylex(styles.optionInput)}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Option ${index + 1}`}
        />
      </div>
      <button
        disabled={options.getLength() < 3}
        className={stylex(
          styles.optionDelete,
          options.getLength() < 3 && styles.optionDeleteDisabled,
        )}
        arial-label="Remove"
        onClick={() => {
          options.splice(index, 1);
        }}
      />
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
  const [totalVotes, setTotalVotes] = useState(() => getTotalVotes(options));

  const updateTotalVotes = useCallback(() => {
    setTotalVotes(getTotalVotes(options));
  }, [options]);

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
            options={options}
            totalVotes={totalVotes}
            updateTotalVotes={updateTotalVotes}
          />
        );
      })}
      <div className={stylex(styles.footer)}>
        <Button
          onClick={() => {
            options.push(createPollOptionMap(editor, ''));
          }}
          small={true}>
          Add Option
        </Button>
      </div>
    </div>
  );
}

export class PollNode extends DecoratorNode<React$Node> {
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
    const elem = document.createElement('span');
    elem.style.display = 'inline-block';
    return elem;
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
