/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode, NodeKey, SerializedLexicalNode} from 'lexical';

import './PollNode.css';

import {useCollaborationContext} from '@lexical/react/LexicalCollaborationPlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getNodeByKey, DecoratorNode} from 'lexical';
import {Spread} from 'libdefs/globals';
import * as React from 'react';
import {useMemo, useRef} from 'react';

import Button from '../ui/Button';
import joinClasses from '../utils/join-classes';

type Options = ReadonlyArray<Option>;

type Option = Readonly<{
  text: string;
  uid: string;
  votes: Array<number>;
}>;

function createUID(): string {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .substr(0, 5);
}

function createPollOption(text = ''): Option {
  return {
    text,
    uid: createUID(),
    votes: [],
  };
}

function cloneOption(
  option: Option,
  text: string,
  votes?: Array<number>,
): Option {
  return {
    text,
    uid: option.uid,
    votes: votes || Array.from(option.votes),
  };
}

function getTotalVotes(options: Options): number {
  return options.reduce((totalVotes, next) => {
    return totalVotes + next.votes.length;
  }, 0);
}

function PollOptionComponent({
  option,
  index,
  options,
  totalVotes,
  withPollNode,
}: {
  index: number;
  option: Option;
  options: Options;
  totalVotes: number;
  withPollNode: (cb: (PollNode) => void) => void;
}): JSX.Element {
  const {clientID} = useCollaborationContext();
  const checkboxRef = useRef(null);
  const votesArray = option.votes;
  const checkedIndex = votesArray.indexOf(clientID);
  const checked = checkedIndex !== -1;
  const votes = votesArray.length;
  const text = option.text;

  return (
    <div className="PollNode__optionContainer">
      <div
        className={joinClasses(
          'PollNode__optionCheckboxWrapper',
          checked && 'PollNode__optionCheckboxChecked',
        )}>
        <input
          ref={checkboxRef}
          className="PollNode__optionCheckbox"
          type="checkbox"
          onChange={(e) => {
            withPollNode((node) => {
              node.toggleVote(option, clientID);
            });
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
          onChange={(e) => {
            withPollNode((node) => {
              node.setOptionText(option, e.target.value);
            });
          }}
          placeholder={`Option ${index + 1}`}
        />
      </div>
      <button
        disabled={options.length < 3}
        className={joinClasses(
          'PollNode__optionDelete',
          options.length < 3 && 'PollNode__optionDeleteDisabled',
        )}
        arial-label="Remove"
        onClick={() => {
          withPollNode((node) => {
            node.deleteOption(option);
          });
        }}
      />
    </div>
  );
}

function PollComponent({
  question,
  options,
  nodeKey,
}: {
  nodeKey: NodeKey;
  options: Options;
  question: string;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const totalVotes = useMemo(() => getTotalVotes(options), [options]);

  const withPollNode = (cb: (node: PollNode) => void): void => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if ($isPollNode(node)) {
        cb(node);
      }
    });
  };

  const addOption = () => {
    withPollNode((node) => {
      node.addOption(createPollOption());
    });
  };

  return (
    <div className="PollNode__container">
      <h2 className="PollNode__heading">{question}</h2>
      {options.map((option, index) => {
        const key = option.uid;
        return (
          <PollOptionComponent
            key={key}
            withPollNode={withPollNode}
            option={option}
            index={index}
            options={options}
            totalVotes={totalVotes}
          />
        );
      })}
      <div className="PollNode__footer">
        <Button onClick={addOption} small={true}>
          Add Option
        </Button>
      </div>
    </div>
  );
}

export type SerializedPollNode = Spread<
  {
    question: string;
    options: Options;
    type: 'poll';
    version: 1;
  },
  SerializedLexicalNode
>;

export class PollNode extends DecoratorNode<JSX.Element> {
  __question: string;
  __options: Options;

  static getType(): string {
    return 'poll';
  }

  static clone(node: PollNode): PollNode {
    return new PollNode(node.__question, node.__options, node.__key);
  }

  static importJSON(serializedNode: SerializedPollNode): PollNode {
    const node = $createPollNode(serializedNode.question);
    serializedNode.options.forEach(node.addOption);
    return node;
  }

  constructor(question: string, options?: Options, key?: NodeKey) {
    super(key);
    this.__question = question;
    this.__options = options || [createPollOption(), createPollOption()];
  }

  exportJSON(): SerializedPollNode {
    return {
      options: this.__options,
      question: this.__question,
      type: 'poll',
      version: 1,
    };
  }

  addOption(option: Option): void {
    const self = this.getWritable<PollNode>();
    const options = Array.from(self.__options);
    options.push(option);
    self.__options = options;
  }

  deleteOption(option: Option): void {
    const self = this.getWritable<PollNode>();
    const options = Array.from(self.__options);
    const index = options.indexOf(option);
    options.splice(index, 1);
    self.__options = options;
  }

  setOptionText(option: Option, text: string): void {
    const self = this.getWritable<PollNode>();
    const clonedOption = cloneOption(option, text);
    const options = Array.from(self.__options);
    const index = options.indexOf(option);
    options[index] = clonedOption;
    self.__options = options;
  }

  toggleVote(option: Option, clientID: number): void {
    const self = this.getWritable<PollNode>();
    const votes = option.votes;
    const votesClone = Array.from(votes);
    const voteIndex = votes.indexOf(clientID);
    if (voteIndex === -1) {
      votesClone.push(clientID);
    } else {
      votesClone.splice(voteIndex, 1);
    }
    const clonedOption = cloneOption(option, option.text, votesClone);
    const options = Array.from(self.__options);
    const index = options.indexOf(option);
    options[index] = clonedOption;
    self.__options = options;
  }

  createDOM(): HTMLElement {
    const elem = document.createElement('span');
    elem.style.display = 'inline-block';
    return elem;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <PollComponent
        question={this.__question}
        options={this.__options}
        nodeKey={this.__key}
      />
    );
  }
}

export function $createPollNode(question: string): PollNode {
  return new PollNode(question);
}

export function $isPollNode(
  node: LexicalNode | null | undefined,
): node is PollNode {
  return node instanceof PollNode;
}
