/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  CommandListenerPriority,
  LexicalNode,
  MutationListener,
} from 'lexical';
import type {JSX} from 'react';

import {$isLinkNode, AutoLinkNode, LinkNode} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  LexicalNodeMenuPlugin,
  MenuOption,
  MenuRenderFn,
} from '@lexical/react/LexicalNodeMenuPlugin';
import {mergeRegister} from '@lexical/utils';
import {
  $getNodeByKey,
  $getSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  createCommand,
  LexicalCommand,
  LexicalEditor,
  NodeKey,
  TextNode,
} from 'lexical';
import {useCallback, useEffect, useMemo, useState} from 'react';
import * as React from 'react';

export type EmbedMatchResult<TEmbedMatchResult = unknown> = {
  url: string;
  id: string;
  data?: TEmbedMatchResult;
};

export interface EmbedConfig<
  TEmbedMatchResultData = unknown,
  TEmbedMatchResult = EmbedMatchResult<TEmbedMatchResultData>,
> {
  // Used to identify this config e.g. youtube, tweet, google-maps.
  type: string;
  // Determine if a given URL is a match and return url data.
  parseUrl: (
    text: string,
  ) => Promise<TEmbedMatchResult | null> | TEmbedMatchResult | null;
  // Create the Lexical embed node from the url data.
  insertNode: (editor: LexicalEditor, result: TEmbedMatchResult) => void;
}

export const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

export const INSERT_EMBED_COMMAND: LexicalCommand<EmbedConfig['type']> =
  createCommand('INSERT_EMBED_COMMAND');

export class AutoEmbedOption extends MenuOption {
  title: string;
  onSelect: (targetNode: LexicalNode | null) => void;
  constructor(
    title: string,
    options: {
      onSelect: (targetNode: LexicalNode | null) => void;
    },
  ) {
    super(title);
    this.title = title;
    this.onSelect = options.onSelect.bind(this);
  }
}

type LexicalAutoEmbedPluginProps<TEmbedConfig extends EmbedConfig> = {
  embedConfigs: Array<TEmbedConfig>;
  onOpenEmbedModalForConfig: (embedConfig: TEmbedConfig) => void;
  getMenuOptions: (
    activeEmbedConfig: TEmbedConfig,
    embedFn: () => void,
    dismissFn: () => void,
  ) => Array<AutoEmbedOption>;
  menuRenderFn: MenuRenderFn<AutoEmbedOption>;
  menuCommandPriority?: CommandListenerPriority;
};

export function LexicalAutoEmbedPlugin<TEmbedConfig extends EmbedConfig>({
  embedConfigs,
  onOpenEmbedModalForConfig,
  getMenuOptions,
  menuRenderFn,
  menuCommandPriority = COMMAND_PRIORITY_LOW,
}: LexicalAutoEmbedPluginProps<TEmbedConfig>): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  const [nodeKey, setNodeKey] = useState<NodeKey | null>(null);
  const [activeEmbedConfig, setActiveEmbedConfig] =
    useState<TEmbedConfig | null>(null);

  const reset = useCallback(() => {
    setNodeKey(null);
    setActiveEmbedConfig(null);
  }, []);

  const checkIfLinkNodeIsEmbeddable = useCallback(
    async (key: NodeKey) => {
      const url = editor.getEditorState().read(function () {
        const linkNode = $getNodeByKey(key);
        if ($isLinkNode(linkNode)) {
          return linkNode.getURL();
        }
      });
      if (url === undefined) {
        return;
      }
      for (const embedConfig of embedConfigs) {
        const urlMatch = await Promise.resolve(embedConfig.parseUrl(url));
        if (urlMatch != null) {
          setActiveEmbedConfig(embedConfig);
          setNodeKey(key);
        }
      }
    },
    [editor, embedConfigs],
  );

  useEffect(() => {
    const listener: MutationListener = (
      nodeMutations,
      {updateTags, dirtyLeaves},
    ) => {
      for (const [key, mutation] of nodeMutations) {
        if (
          mutation === 'created' &&
          updateTags.has('paste') &&
          dirtyLeaves.size <= 3
        ) {
          checkIfLinkNodeIsEmbeddable(key);
        } else if (key === nodeKey) {
          reset();
        }
      }
    };
    return mergeRegister(
      ...[LinkNode, AutoLinkNode].map((Klass) =>
        editor.registerMutationListener(Klass, (...args) => listener(...args), {
          skipInitialization: true,
        }),
      ),
    );
  }, [checkIfLinkNodeIsEmbeddable, editor, embedConfigs, nodeKey, reset]);

  useEffect(() => {
    return editor.registerCommand(
      INSERT_EMBED_COMMAND,
      (embedConfigType: TEmbedConfig['type']) => {
        const embedConfig = embedConfigs.find(
          ({type}) => type === embedConfigType,
        );
        if (embedConfig) {
          onOpenEmbedModalForConfig(embedConfig);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor, embedConfigs, onOpenEmbedModalForConfig]);

  const embedLinkViaActiveEmbedConfig = useCallback(
    async function () {
      if (activeEmbedConfig != null && nodeKey != null) {
        const linkNode = editor.getEditorState().read(() => {
          const node = $getNodeByKey(nodeKey);
          if ($isLinkNode(node)) {
            return node;
          }
          return null;
        });

        if ($isLinkNode(linkNode)) {
          const result = await Promise.resolve(
            activeEmbedConfig.parseUrl(linkNode.__url),
          );
          if (result != null) {
            editor.update(() => {
              if (!$getSelection()) {
                linkNode.selectEnd();
              }
              activeEmbedConfig.insertNode(editor, result);
              if (linkNode.isAttached()) {
                linkNode.remove();
              }
            });
          }
        }
      }
    },
    [activeEmbedConfig, editor, nodeKey],
  );

  const options = useMemo(() => {
    return activeEmbedConfig != null && nodeKey != null
      ? getMenuOptions(activeEmbedConfig, embedLinkViaActiveEmbedConfig, reset)
      : [];
  }, [
    activeEmbedConfig,
    embedLinkViaActiveEmbedConfig,
    getMenuOptions,
    nodeKey,
    reset,
  ]);

  const onSelectOption = useCallback(
    (
      selectedOption: AutoEmbedOption,
      targetNode: TextNode | null,
      closeMenu: () => void,
    ) => {
      editor.update(() => {
        selectedOption.onSelect(targetNode);
        closeMenu();
      });
    },
    [editor],
  );

  return nodeKey != null ? (
    <LexicalNodeMenuPlugin<AutoEmbedOption>
      nodeKey={nodeKey}
      onClose={reset}
      onSelectOption={onSelectOption}
      options={options}
      menuRenderFn={menuRenderFn}
      commandPriority={menuCommandPriority}
    />
  ) : null;
}
