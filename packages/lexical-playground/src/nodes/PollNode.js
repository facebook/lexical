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
import Button from '../ui/Button';
import joinClasses from '../utils/join-classes';
import './PollNode.css';

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
    <div className="PollNode__optionContainer">
      <div
        className={joinClasses(
          'PollNode__optionCheckboxWrapper',
          checked && 'PollNode__optionCheckboxChecked',
        )}
        onClick={() => {
          const checkbox = checkboxRef.current;
          if (checkbox !== null) {
            checkbox.click();
          }
        }}>
        <input
          ref={checkboxRef}
          className="PollNode__optionCheckbox"
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
      <div className="PollNode__optionInputWrapper">
        <div
          className="PollNode__optionInputVotes"
          style={{width: `${votes === 0 ? 0 : (votes / totalVotes) * 100}%`}}
        />
        <span className="PollNode__optionInputVotesCount">
          {votes > 0 && (votes === 1 ? '1 vote' : `${votes} votes`)}
        </span>
        <input
          className="PollNode__optionInput"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Option ${index + 1}`}
        />
      </div>
      <button
        disabled={options.getLength() < 3}
        className={joinClasses(
          'PollNode__optionDelete',
          options.getLength() < 3 && 'PollNode__optionDeleteDisabled',
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
    <div className="PollNode__container">
      <h2 className="PollNode__heading">{question}</h2>
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
      <div className="PollNode__footer">
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
