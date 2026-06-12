/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMExportOutput,
  EditorConfig,
  ElementFormatType,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  Spread,
} from 'lexical';
import type {JSX} from 'react';

import {
  $createCodeHighlightNode,
  $createCodeNode,
  CodeHighlightNode,
  CodeNode,
} from '@lexical/code';
import {registerCodeHighlighting} from '@lexical/code-prism';
import {BlockWithAlignableContents} from '@lexical/react/LexicalBlockWithAlignableContents';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {
  DecoratorBlockNode,
  SerializedDecoratorBlockNode,
} from '@lexical/react/LexicalDecoratorBlockNode';
import {LexicalNestedComposer} from '@lexical/react/LexicalNestedComposer';
import {$getRoot, createEditor} from 'lexical';
import * as React from 'react';
import {useCallback, useEffect, useMemo, useState} from 'react';

type GitHubCodeComponentProps = Readonly<{
  className: Readonly<{
    base: string;
    focus: string;
  }>;
  format: ElementFormatType | null;
  nodeKey: NodeKey;
  url: string;
  owner: string;
  repo: string;
  path: string;
  branch: string;
  startLine?: number;
  endLine?: number;
  language?: string;
}>;

const DEFAULT_VISIBLE_LINE_COUNT = 5;
const LINE_COUNT_INCREMENT = 5;

function getGistFileSlug(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function GitHubCodeComponent({
  className,
  format,
  nodeKey,
  url,
  owner,
  repo,
  path,
  branch,
  startLine,
  endLine,
  language,
}: GitHubCodeComponentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeContent, setCodeContent] = useState<string>('');
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [visibleLineCount, setVisibleLineCount] = useState(
    DEFAULT_VISIBLE_LINE_COUNT,
  );

  const codeEditor = useMemo(() => {
    const editor = createEditor({
      namespace: 'GitHubCodeEmbed',
      nodes: [CodeNode, CodeHighlightNode],
      onError: editorError => {
        throw editorError;
      },
    });
    editor.setEditable(false);
    return editor;
  }, []);

  useEffect(() => {
    return registerCodeHighlighting(codeEditor);
  }, [codeEditor]);

  const fetchCode = useCallback(
    async (signal: AbortSignal) => {
      try {
        setIsLoading(true);
        setError(null);

        if (url.includes('gist.github.com')) {
          const gistMatch = url.match(
            /^https:\/\/gist\.github\.com\/([^/]+)\/([a-f0-9]+)(?:#file-([^#]+?)(?:-L\d+(?:-L\d+)?)?)?$/i,
          );
          if (!gistMatch) {
            throw new Error('Invalid Gist URL');
          }
          const [, , gistId, fileName] = gistMatch;

          const response = await fetch(
            `https://api.github.com/gists/${gistId}`,
            {
              signal,
            },
          );
          if (!response.ok) {
            throw new Error(`Failed to fetch gist: ${response.statusText}`);
          }
          const gistData = await response.json();
          const files: Record<string, {content: string}> = gistData.files;
          const file =
            (fileName &&
              (files[fileName] ||
                Object.entries(files).find(
                  ([name]) => getGistFileSlug(name) === fileName,
                )?.[1])) ||
            files[Object.keys(files)[0]];
          if (!file) {
            throw new Error('File not found in gist');
          }
          setCodeContent(file.content);
          setVisibleLineCount(DEFAULT_VISIBLE_LINE_COUNT);
        } else if (url.includes('raw.githubusercontent.com')) {
          const response = await fetch(url, {signal});
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
          }
          const content = await response.text();
          setCodeContent(content);
          setVisibleLineCount(DEFAULT_VISIBLE_LINE_COUNT);
        } else {
          const response = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
            {signal},
          );
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
          }
          const content = await response.text();
          setCodeContent(content);
          setVisibleLineCount(DEFAULT_VISIBLE_LINE_COUNT);
        }

        setLastLoadedAt(Date.now());
        setIsLoading(false);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : 'Failed to load code');
        }
        setIsLoading(false);
      }
    },
    [branch, owner, path, repo, url],
  );

  useEffect(() => {
    const abortController = new AbortController();
    Promise.resolve().then(() => {
      fetchCode(abortController.signal);
    });
    return () => {
      abortController.abort();
    };
  }, [fetchCode, refreshNonce]);

  const processedCode = React.useMemo(() => {
    if (!codeContent) {
      return '';
    }

    const lines = codeContent.split('\n');
    if (startLine !== undefined) {
      return lines
        .slice(startLine - 1, endLine !== undefined ? endLine : startLine)
        .join('\n');
    }
    return codeContent;
  }, [codeContent, startLine, endLine]);

  const processedLines = useMemo(
    () => (processedCode === '' ? [] : processedCode.split('\n')),
    [processedCode],
  );
  const isCollapsed = processedLines.length > visibleLineCount;
  const visibleLines = isCollapsed
    ? processedLines.slice(0, visibleLineCount)
    : processedLines;
  const visibleCode = visibleLines.join('\n');

  useEffect(() => {
    codeEditor.update(() => {
      const root = $getRoot();
      root.clear();

      if (visibleCode !== '') {
        const codeNode = $createCodeNode(language || undefined);
        codeNode.append($createCodeHighlightNode(visibleCode));
        root.append(codeNode);
      }
    });
  }, [codeEditor, language, visibleCode]);

  const firstLine = startLine || 1;
  const lineNumbers = Array.from(
    {length: visibleLines.length},
    (_, index) => firstLine + index,
  );
  const remainingLineCount = processedLines.length - visibleLines.length;
  const canExpandCode = remainingLineCount > 0;
  const canCollapseCode =
    processedLines.length > DEFAULT_VISIBLE_LINE_COUNT &&
    visibleLineCount > DEFAULT_VISIBLE_LINE_COUNT;

  const fileHeader = `${owner}/${repo}/${path}${
    startLine ? ` (lines ${startLine}${endLine ? `-${endLine}` : ''})` : ''
  }`;

  return (
    <BlockWithAlignableContents
      className={className}
      format={format}
      nodeKey={nodeKey}>
      <div className="github-code-embed">
        <div className="github-code-header">
          <a href={url} target="_blank" rel="noopener noreferrer">
            {fileHeader}
          </a>
          <button
            type="button"
            className="github-code-refresh"
            onClick={() => setRefreshNonce(nonce => nonce + 1)}
            aria-label="Refresh GitHub code embed">
            Refresh
          </button>
        </div>
        <div className="github-code-content">
          {isLoading ? (
            <div className="github-code-loading">Loading code...</div>
          ) : error ? (
            <div className="github-code-error">Error: {error}</div>
          ) : (
            <>
              <div className="github-code-code">
                <pre className="github-code-lines" aria-hidden="true">
                  {lineNumbers.join('\n')}
                </pre>
                <LexicalNestedComposer
                  initialEditor={codeEditor}
                  skipCollabChecks={true}
                  skipEditableListener={true}>
                  <ContentEditable
                    className="github-code-editor"
                    aria-label="GitHub code"
                  />
                </LexicalNestedComposer>
              </div>
              {lastLoadedAt !== null ? (
                <div className="github-code-status">
                  <span>
                    Loaded {new Date(lastLoadedAt).toLocaleTimeString()}
                    {processedLines.length > DEFAULT_VISIBLE_LINE_COUNT
                      ? ` - showing ${visibleLines.length} of ${processedLines.length} lines`
                      : ''}
                  </span>
                  {canExpandCode || canCollapseCode ? (
                    <span className="github-code-expand-controls">
                      {canCollapseCode ? (
                        <button
                          type="button"
                          className="github-code-expand"
                          onClick={() =>
                            setVisibleLineCount(DEFAULT_VISIBLE_LINE_COUNT)
                          }>
                          Collapse
                        </button>
                      ) : null}
                      {canExpandCode ? (
                        <>
                          <button
                            type="button"
                            className="github-code-expand"
                            onClick={() =>
                              setVisibleLineCount(count =>
                                Math.min(
                                  count + LINE_COUNT_INCREMENT,
                                  processedLines.length,
                                ),
                              )
                            }>
                            Show{' '}
                            {Math.min(LINE_COUNT_INCREMENT, remainingLineCount)}{' '}
                            more
                          </button>
                          <button
                            type="button"
                            className="github-code-expand"
                            onClick={() =>
                              setVisibleLineCount(processedLines.length)
                            }>
                            Show all
                          </button>
                        </>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </BlockWithAlignableContents>
  );
}

export type SerializedGitHubCodeNode = Spread<
  {
    url: string;
    owner: string;
    repo: string;
    path: string;
    branch: string;
    startLine?: number;
    endLine?: number;
    language?: string;
  },
  SerializedDecoratorBlockNode
>;

export class GitHubCodeNode extends DecoratorBlockNode {
  __url: string;
  __owner: string;
  __repo: string;
  __path: string;
  __branch: string;
  __startLine?: number;
  __endLine?: number;
  __language?: string;

  static getType(): string {
    return 'github-code';
  }

  static clone(node: GitHubCodeNode): GitHubCodeNode {
    return new GitHubCodeNode(
      node.__url,
      node.__owner,
      node.__repo,
      node.__path,
      node.__branch,
      node.__startLine,
      node.__endLine,
      node.__language,
      node.__format,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedGitHubCodeNode): GitHubCodeNode {
    return $createGitHubCodeNode(
      serializedNode.url,
      serializedNode.owner,
      serializedNode.repo,
      serializedNode.path,
      serializedNode.branch,
      serializedNode.startLine,
      serializedNode.endLine,
      serializedNode.language,
    ).updateFromJSON(serializedNode);
  }

  exportJSON(): SerializedGitHubCodeNode {
    return {
      ...super.exportJSON(),
      branch: this.__branch,
      endLine: this.__endLine,
      language: this.__language,
      owner: this.__owner,
      path: this.__path,
      repo: this.__repo,
      startLine: this.__startLine,
      url: this.__url,
    };
  }

  constructor(
    url: string,
    owner: string,
    repo: string,
    path: string,
    branch: string,
    startLine?: number,
    endLine?: number,
    language?: string,
    format?: ElementFormatType,
    key?: NodeKey,
  ) {
    super(format, key);
    this.__url = url;
    this.__owner = owner;
    this.__repo = repo;
    this.__path = path;
    this.__branch = branch;
    this.__startLine = startLine;
    this.__endLine = endLine;
    this.__language = language;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('div');
    element.setAttribute('data-lexical-github-code', this.__url);
    element.setAttribute('data-owner', this.__owner);
    element.setAttribute('data-repo', this.__repo);
    element.setAttribute('data-path', this.__path);
    element.setAttribute('data-branch', this.__branch);
    if (this.__startLine !== undefined) {
      element.setAttribute('data-start-line', String(this.__startLine));
    }
    if (this.__endLine !== undefined) {
      element.setAttribute('data-end-line', String(this.__endLine));
    }
    if (this.__language) {
      element.setAttribute('data-language', this.__language);
    }
    const text = document.createTextNode(this.getTextContent());
    element.append(text);
    return {element};
  }

  getTextContent(): string {
    return this.__url;
  }

  decorate(_editor: LexicalEditor, config: EditorConfig): JSX.Element {
    const embedBlockTheme = config.theme.embedBlock || {};
    const className = {
      base: embedBlockTheme.base || '',
      focus: embedBlockTheme.focus || '',
    };
    return (
      <GitHubCodeComponent
        className={className}
        format={this.__format}
        nodeKey={this.getKey()}
        url={this.__url}
        owner={this.__owner}
        repo={this.__repo}
        path={this.__path}
        branch={this.__branch}
        startLine={this.__startLine}
        endLine={this.__endLine}
        language={this.__language}
      />
    );
  }
}

export function $createGitHubCodeNode(
  url: string,
  owner: string,
  repo: string,
  path: string,
  branch: string,
  startLine?: number,
  endLine?: number,
  language?: string,
): GitHubCodeNode {
  return new GitHubCodeNode(
    url,
    owner,
    repo,
    path,
    branch,
    startLine,
    endLine,
    language,
  );
}

export function $isGitHubCodeNode(
  node: GitHubCodeNode | LexicalNode | null | undefined,
): node is GitHubCodeNode {
  return node instanceof GitHubCodeNode;
}
