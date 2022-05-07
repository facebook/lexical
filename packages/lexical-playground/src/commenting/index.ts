/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export type CommentContextType = {
  isActive: boolean;
  setActive: (val: boolean) => void;
};

export type Comment = {
  author: string;
  content: string;
  id: string;
  timeStamp: number;
  type: 'comment';
};

export type Thread = {
  comments: Array<Comment>;
  id: string;
  quote: string;
  type: 'thread';
};

export type Comments = Array<Thread | Comment>;

function createUID(): string {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, '')
    .substr(0, 5);
}

export function createComment(content: string): Comment {
  return {
    author: 'Playground User',
    content,
    id: createUID(),
    timeStamp: performance.now(),
    type: 'comment',
  };
}

export function createThread(quote: string, content: string): Thread {
  return {
    comments: [createComment(content)],
    id: createUID(),
    quote,
    type: 'thread',
  };
}

export function cloneThread(thread: Thread): Thread {
  return {
    comments: Array.from(thread.comments),
    id: thread.id,
    quote: thread.quote,
    type: 'thread',
  };
}
