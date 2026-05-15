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
  type MenuRenderFn,
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
  PASTE_TAG,
  TextNode,
} from 'lexical';
import {useCallback, useEffect, useMemo, useState} from 'react';

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
  /**
   * An array of configurations used to insert Embed elements
   */
  embedConfigs: TEmbedConfig[];
  /**
   * Callback for handling the {@link INSERT_EMBED_COMMAND} command.
   * If no function is passed, the command is not registered
   * @param embedConfig - the config corresponding to the {@link EmbedConfig.type} of the inserted Embed
   * @returns
   */
  onOpenEmbedModalForConfig?: (embedConfig: TEmbedConfig) => void;
  /**
   * A function that links a specific configuration to a set of options.
   * Each option can be handling by click or press the Enter or Tab key
   * when the cursor hovers over it.
   * Pass the necessary callbacks to {@link AutoEmbedOption.onSelect}
   * @param activeEmbedConfig - the current active config is determined by a match
   * from the {@link EmbedConfig.parseUrl} of the inserted AutoLinkNode
   * @param embedFn - callback for handling option selection.
   * Calling the callback will invoke the {@link EmbedConfig.insertNode} method
   * and remove the inserted AutoLinkNode
   * @param dismissFn - сallback to deselect. Calling the callback will hide the options menu
   * @returns array of options from {@link AutoEmbedOption} instances
   */
  getMenuOptions: (
    activeEmbedConfig: TEmbedConfig,
    embedFn: () => void,
    dismissFn: () => void,
  ) => AutoEmbedOption[];
  /**
   * A function for rendering button menu.
   * By default, it displays a plain list with the option titles
   */
  menuRenderFn?: MenuRenderFn<AutoEmbedOption>;
  /**
   * Priority for key handling in the menu. The default is `COMMAND_PRIORITY_LOW`
   */
  menuCommandPriority?: CommandListenerPriority;
};

/**
 * Watches for pasted AutoLink nodes that match any of the provided embed configurations (e.g., YouTube, Twitter URLs).
 * When a match is found, it shows a menu offering to replace the link with an embedded node.
 *
 * You can pass a generic type to the plugin to extend {@link EmbedConfig}
 * with additional data in {@link EmbedMatchResult} that will be passed to the callbacks
 *
 * @example
 * Usage
 * ```tsx
 * interface CustomEmbedConfig extends EmbedConfig<{
 *   domain: string;
 *   oid?: string;
 * }> {
 *   // Icon for display.
 *   icon?: JSX.Element;
 *   // Embed a Figma Project.
 *   description?: string;
 * };
 *
 * return (
 *  <LexicalAutoEmbedPlugin<CustomEmbedConfig>
 *    embedConfigs={EmbedConfigs}
 *    getMenuOptions={getMenuOptions}
 *  />
 * );
 * ```
 */
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
          updateTags.has(PASTE_TAG) &&
          dirtyLeaves.size <= 3
        ) {
          checkIfLinkNodeIsEmbeddable(key);
        } else if (key === nodeKey) {
          reset();
        }
      }
    };
    return mergeRegister(
      ...[LinkNode, AutoLinkNode].map(Klass =>
        editor.registerMutationListener(Klass, (...args) => listener(...args), {
          skipInitialization: true,
        }),
      ),
    );
  }, [checkIfLinkNodeIsEmbeddable, editor, nodeKey, reset]);

  useEffect(() => {
    if (!onOpenEmbedModalForConfig) return;

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
