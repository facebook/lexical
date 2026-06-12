/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalCommand} from 'lexical';

import {$insertNodeToNearestRoot} from '@lexical/utils';
import {COMMAND_PRIORITY_EDITOR, createCommand, defineExtension} from 'lexical';

import {
  $createGitHubCodeNode,
  GitHubCodeNode,
} from '../../nodes/GitHubCodeNode';

export type GitHubCodePayload = {
  url: string;
  owner: string;
  repo: string;
  path: string;
  branch: string;
  startLine?: number;
  endLine?: number;
  language?: string;
};

export const INSERT_GITHUB_CODE_COMMAND: LexicalCommand<GitHubCodePayload> =
  createCommand('INSERT_GITHUB_CODE_COMMAND');

export const GitHubCodeExtension = defineExtension({
  name: '@lexical/playground/GitHubCode',
  nodes: [GitHubCodeNode],
  register: editor =>
    editor.registerCommand<GitHubCodePayload>(
      INSERT_GITHUB_CODE_COMMAND,
      payload => {
        const githubCodeNode = $createGitHubCodeNode(
          payload.url,
          payload.owner,
          payload.repo,
          payload.path,
          payload.branch,
          payload.startLine,
          payload.endLine,
          payload.language,
        );
        $insertNodeToNearestRoot(githubCodeNode);
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    ),
});
