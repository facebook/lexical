/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {GitHubCodePayload} from '../GitHubCodeExtension';
import type {LexicalEditor} from 'lexical';
import type {JSX} from 'react';

import {
  AutoEmbedOption,
  EmbedConfig,
  EmbedMatchResult,
  LexicalAutoEmbedPlugin,
  URL_MATCHER,
} from '@lexical/react/LexicalAutoEmbedPlugin';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useMemo, useState} from 'react';

import useModal from '../../hooks/useModal';
import Button from '../../ui/Button';
import {DialogActions} from '../../ui/Dialog';
import {INSERT_FIGMA_COMMAND} from '../FigmaExtension';
import {INSERT_GITHUB_CODE_COMMAND} from '../GitHubCodeExtension';
import {INSERT_TWEET_COMMAND} from '../TwitterExtension';
import {INSERT_YOUTUBE_COMMAND} from '../YouTubeExtension';

export type GitHubCodeMatchResult = EmbedMatchResult & GitHubCodePayload;

type PlaygroundEmbedMatchResult = EmbedMatchResult | GitHubCodeMatchResult;

interface PlaygroundEmbedConfig extends EmbedConfig<
  unknown,
  PlaygroundEmbedMatchResult
> {
  // Human readable name of the embedded content e.g. Tweet or Google Map.
  contentName: string;

  // Icon for display.
  icon?: JSX.Element;

  // An example of a matching url https://twitter.com/jack/status/20
  exampleUrl: string;

  // For extra searching.
  keywords: Array<string>;

  // Embed a Figma Project.
  description?: string;
}

function isGitHubCodeMatchResult(
  result: PlaygroundEmbedMatchResult,
): result is GitHubCodeMatchResult {
  return (
    'owner' in result &&
    'repo' in result &&
    'path' in result &&
    'branch' in result
  );
}

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  c: 'c',
  cc: 'cpp',
  cpp: 'cpp',
  cs: 'csharp',
  css: 'css',
  go: 'go',
  h: 'c',
  hpp: 'cpp',
  html: 'html',
  java: 'java',
  js: 'javascript',
  json: 'json',
  jsx: 'jsx',
  kt: 'kotlin',
  md: 'markdown',
  mjs: 'javascript',
  php: 'php',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  sh: 'bash',
  ts: 'typescript',
  tsx: 'tsx',
  txt: 'text',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
};

function getLanguageFromPath(path: string): string | undefined {
  const extension = path.split('.').pop();
  return extension ? LANGUAGE_BY_EXTENSION[extension.toLowerCase()] : undefined;
}

export const YoutubeEmbedConfig: PlaygroundEmbedConfig = {
  contentName: 'Youtube Video',

  exampleUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',

  // Icon for display.
  icon: <i className="icon youtube" />,

  insertNode: (editor: LexicalEditor, result: EmbedMatchResult) => {
    editor.dispatchCommand(INSERT_YOUTUBE_COMMAND, result.id);
  },

  keywords: ['youtube', 'video'],

  // Determine if a given URL is a match and return url data.
  parseUrl: async (url: string) => {
    const match =
      /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/.exec(url);

    const id = match ? (match?.[2].length === 11 ? match[2] : null) : null;

    if (id != null) {
      return {
        id,
        url,
      };
    }

    return null;
  },

  type: 'youtube-video',
};

export const TwitterEmbedConfig: PlaygroundEmbedConfig = {
  // e.g. Tweet or Google Map.
  contentName: 'X(Tweet)',

  exampleUrl: 'https://x.com/jack/status/20',

  // Icon for display.
  icon: <i className="icon x" />,

  // Create the Lexical embed node from the url data.
  insertNode: (editor: LexicalEditor, result: EmbedMatchResult) => {
    editor.dispatchCommand(INSERT_TWEET_COMMAND, result.id);
  },

  // For extra searching.
  keywords: ['tweet', 'twitter', 'x'],

  // Determine if a given URL is a match and return url data.
  parseUrl: (text: string) => {
    const match =
      /^https:\/\/(twitter|x)\.com\/(#!\/)?(\w+)\/status(es)*\/(\d+)/.exec(
        text,
      );

    if (match != null) {
      return {
        id: match[5],
        url: match[1],
      };
    }

    return null;
  },

  type: 'tweet',
};

export const FigmaEmbedConfig: PlaygroundEmbedConfig = {
  contentName: 'Figma Document',

  exampleUrl: 'https://www.figma.com/file/LKQ4FJ4bTnCSjedbRpk931/Sample-File',

  icon: <i className="icon figma" />,

  insertNode: (editor: LexicalEditor, result: EmbedMatchResult) => {
    editor.dispatchCommand(INSERT_FIGMA_COMMAND, result.id);
  },

  keywords: ['figma', 'figma.com', 'mock-up'],

  // Determine if a given URL is a match and return url data.
  parseUrl: (text: string) => {
    const match =
      /https:\/\/([\w.-]+\.)?figma.com\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/.exec(
        text,
      );

    if (match != null) {
      return {
        id: match[3],
        url: match[0],
      };
    }

    return null;
  },

  type: 'figma',
};

export const GitHubCodeEmbedConfig: PlaygroundEmbedConfig = {
  contentName: 'GitHub Code',

  exampleUrl: 'https://github.com/facebook/lexical/blob/main/README.md',

  icon: <i className="icon github" />,

  insertNode: (editor: LexicalEditor, result: EmbedMatchResult) => {
    if (!isGitHubCodeMatchResult(result)) {
      return;
    }
    editor.dispatchCommand(INSERT_GITHUB_CODE_COMMAND, {
      branch: result.branch,
      endLine: result.endLine,
      language: result.language,
      owner: result.owner,
      path: result.path,
      repo: result.repo,
      startLine: result.startLine,
      url: result.url,
    });
  },

  keywords: ['github', 'code', 'gist'],

  // Determine if a given URL is a match and return url data.
  parseUrl: (text: string): GitHubCodeMatchResult | null => {
    // Blob URL: https://github.com/{owner}/{repo}/blob/{branch}/{path}#L{start}-L{end}
    const blobMatch =
      /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+?)(?:#L(\d+)(?:-L(\d+))?)?$/.exec(
        text,
      );
    if (blobMatch != null) {
      const [, owner, repo, branch, path, startLine, endLine] = blobMatch;
      return {
        branch,
        endLine: endLine ? parseInt(endLine, 10) : undefined,
        id: text,
        language: getLanguageFromPath(path),
        owner,
        path,
        repo,
        startLine: startLine ? parseInt(startLine, 10) : undefined,
        url: text,
      };
    }

    // Blame URL: https://github.com/{owner}/{repo}/blame/{branch}/{path}#L{start}
    const blameMatch =
      /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blame\/([^/]+)\/(.+?)(?:#L(\d+)(?:-L(\d+))?)?$/.exec(
        text,
      );
    if (blameMatch != null) {
      const [, owner, repo, branch, path, startLine, endLine] = blameMatch;
      return {
        branch,
        endLine: endLine ? parseInt(endLine, 10) : undefined,
        id: text,
        language: getLanguageFromPath(path),
        owner,
        path,
        repo,
        startLine: startLine ? parseInt(startLine, 10) : undefined,
        url: text,
      };
    }

    // Gist URL: https://gist.github.com/{user}/{gist_id}#file-{filename}-L{start}-L{end}
    const gistMatch =
      /^https:\/\/gist\.github\.com\/([^/]+)\/([a-f0-9]+)(?:#file-(.+?)(?:-L(\d+)(?:-L(\d+))?)?)?$/i.exec(
        text,
      );
    if (gistMatch != null) {
      const [, owner, gistId, fileName, startLine, endLine] = gistMatch;
      return {
        branch: 'main',
        endLine: endLine ? parseInt(endLine, 10) : undefined,
        id: text,
        language: fileName ? getLanguageFromPath(fileName) : undefined,
        owner,
        path: fileName || '',
        repo: gistId,
        startLine: startLine ? parseInt(startLine, 10) : undefined,
        url: text,
      };
    }

    // Raw URL: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
    const rawMatch =
      /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+?)(?:#L(\d+)(?:-L(\d+))?)?$/.exec(
        text,
      );
    if (rawMatch != null) {
      const [, owner, repo, branch, path, startLine, endLine] = rawMatch;
      return {
        branch,
        endLine: endLine ? parseInt(endLine, 10) : undefined,
        id: text,
        language: getLanguageFromPath(path),
        owner,
        path,
        repo,
        startLine: startLine ? parseInt(startLine, 10) : undefined,
        url: text,
      };
    }

    return null;
  },

  type: 'github-code',
};

export const EmbedConfigs = [
  TwitterEmbedConfig,
  YoutubeEmbedConfig,
  FigmaEmbedConfig,
  GitHubCodeEmbedConfig,
];

const debounce = (callback: (text: string) => void, delay: number) => {
  let timeoutId: number;
  return (text: string) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(text);
    }, delay);
  };
};

export function AutoEmbedDialog({
  embedConfig,
  onClose,
}: {
  embedConfig: PlaygroundEmbedConfig;
  onClose: () => void;
}): JSX.Element {
  const [text, setText] = useState('');
  const [editor] = useLexicalComposerContext();
  const [embedResult, setEmbedResult] = useState<EmbedMatchResult | null>(null);

  const validateText = useMemo(
    () =>
      debounce((inputText: string) => {
        const urlMatch = URL_MATCHER.exec(inputText);
        if (embedConfig != null && inputText != null && urlMatch != null) {
          Promise.resolve(embedConfig.parseUrl(inputText)).then(parseResult => {
            setEmbedResult(parseResult);
          });
        } else if (embedResult != null) {
          setEmbedResult(null);
        }
      }, 200),
    [embedConfig, embedResult],
  );

  const onClick = () => {
    if (embedResult != null) {
      embedConfig.insertNode(editor, embedResult);
      onClose();
    }
  };

  return (
    <div style={{width: '600px'}}>
      <div className="Input__wrapper">
        <input
          type="text"
          className="Input__input"
          placeholder={embedConfig.exampleUrl}
          value={text}
          data-test-id={`${embedConfig.type}-embed-modal-url`}
          onChange={e => {
            const {value} = e.target;
            setText(value);
            validateText(value);
          }}
        />
      </div>
      <DialogActions>
        <Button
          disabled={!embedResult}
          onClick={onClick}
          data-test-id={`${embedConfig.type}-embed-modal-submit-btn`}>
          Embed
        </Button>
      </DialogActions>
    </div>
  );
}

export default function AutoEmbedPlugin(): JSX.Element {
  const [modal, showModal] = useModal();

  const openEmbedModal = (embedConfig: PlaygroundEmbedConfig) => {
    showModal(`Embed ${embedConfig.contentName}`, onClose => (
      <AutoEmbedDialog embedConfig={embedConfig} onClose={onClose} />
    ));
  };

  const getMenuOptions = (
    activeEmbedConfig: PlaygroundEmbedConfig,
    embedFn: () => void,
    dismissFn: () => void,
  ) => {
    return [
      new AutoEmbedOption('Dismiss', {
        onSelect: dismissFn,
      }),
      new AutoEmbedOption(`Embed ${activeEmbedConfig.contentName}`, {
        onSelect: embedFn,
      }),
    ];
  };

  return (
    <>
      {modal}
      <LexicalAutoEmbedPlugin<PlaygroundEmbedConfig>
        embedConfigs={EmbedConfigs}
        onOpenEmbedModalForConfig={openEmbedModal}
        getMenuOptions={getMenuOptions}
      />
    </>
  );
}
