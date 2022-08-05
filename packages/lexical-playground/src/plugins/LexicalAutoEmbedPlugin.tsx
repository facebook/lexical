/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {LexicalNode, MutationListener} from 'lexical';

import {$isLinkNode, AutoLinkNode, LinkNode} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  LexicalNodeMenuPlugin,
  TypeaheadOption,
} from '@lexical/react/src/LexicalTypeaheadMenuPlugin';
import {mergeRegister} from '@lexical/utils';
import {
  $getNodeByKey,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand,
  LexicalEditor,
  NodeKey,
  TextNode,
} from 'lexical';
import {useCallback, useEffect, useMemo, useState} from 'react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';

export type EmbedMatchResult = {
  url: string;
  id: string;
};

export interface EmbedConfig {
  // Used to identify this config e.g. youtube, tweet, google-maps.
  type: string;
  // Determine if a given URL is a match and return url data.
  parseUrl: (text: string) => EmbedMatchResult | null;
  // Create the Lexical embed node from the url data.
  insertNode: (editor: LexicalEditor, result: EmbedMatchResult) => void;
}

export const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

export const INSERT_EMBED_COMMAND: LexicalCommand<EmbedConfig['type']> =
  createCommand();

export type EmbedMenuProps = {
  selectedItemIndex: number | null;
  onOptionClick: (option: AutoEmbedOption, index: number) => void;
  onOptionMouseEnter: (index: number) => void;
  options: Array<AutoEmbedOption>;
};

export type EmbedMenuComponent = React.ComponentType<EmbedMenuProps>;

export class AutoEmbedOption extends TypeaheadOption {
  title: string;
  icon?: JSX.Element;
  onSelect: (targetNode: LexicalNode | null) => void;
  constructor(
    title: string,
    options: {
      icon?: JSX.Element;
      onSelect: (targetNode: LexicalNode | null) => void;
    },
  ) {
    super(title);
    this.title = title;
    this.icon = options.icon;
    this.onSelect = options.onSelect.bind(this);
  }
}

type LexicalAutoEmbedPluginProps<TEmbedConfig extends EmbedConfig> = {
  embedConfigs: Array<TEmbedConfig>;
  onOpenEmbedModalForConfig: (embedConfig: TEmbedConfig) => void;
  menuComponent: EmbedMenuComponent;
  getMenuOptions: (
    activeEmbedConfig: TEmbedConfig,
    embedFn: () => void,
    dismissFn: () => void,
  ) => Array<AutoEmbedOption>;
};

export function LexicalAutoEmbedPlugin<TEmbedConfig extends EmbedConfig>({
  embedConfigs,
  onOpenEmbedModalForConfig,
  getMenuOptions,
  menuComponent: MenuComponent,
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
    (key: NodeKey) => {
      editor.getEditorState().read(() => {
        const linkNode = $getNodeByKey(key);
        if ($isLinkNode(linkNode)) {
          const embedConfigMatch = embedConfigs.find((embedConfig) =>
            embedConfig.parseUrl(linkNode.__url),
          );
          if (embedConfigMatch != null) {
            setActiveEmbedConfig(embedConfigMatch);
            setNodeKey(linkNode.getKey());
          }
        }
      });
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
          dirtyLeaves.size === 1
        ) {
          checkIfLinkNodeIsEmbeddable(key);
        } else if (key === nodeKey) {
          reset();
        }
      }
    };
    return mergeRegister(
      ...[LinkNode, AutoLinkNode].map((Klass) =>
        editor.registerMutationListener(Klass, (...args) => listener(...args)),
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

  const embedLinkViaActiveEmbedConfig = useCallback(() => {
    if (activeEmbedConfig != null && nodeKey != null) {
      const linkNode = editor.getEditorState().read(() => {
        const node = $getNodeByKey(nodeKey);
        if ($isLinkNode(node)) {
          return node;
        }
        return null;
      });
      if ($isLinkNode(linkNode)) {
        const result = activeEmbedConfig.parseUrl(linkNode.__url);
        if (result != null) {
          editor.update(() => {
            activeEmbedConfig.insertNode(editor, result);
          });
          if (linkNode.isAttached()) {
            editor.update(() => {
              linkNode.remove();
            });
          }
        }
      }
    }
  }, [activeEmbedConfig, editor, nodeKey]);

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
      menuRenderFn={(
        anchorElement,
        {selectedIndex, selectOptionAndCleanUp, setHighlightedIndex},
      ) =>
        anchorElement && nodeKey != null
          ? ReactDOM.createPortal(
              <MenuComponent
                options={options}
                selectedItemIndex={selectedIndex}
                onOptionClick={(option: AutoEmbedOption, index: number) => {
                  setHighlightedIndex(index);
                  selectOptionAndCleanUp(option);
                }}
                onOptionMouseEnter={(index: number) => {
                  setHighlightedIndex(index);
                }}
              />,
              anchorElement,
            )
          : null
      }
    />
  ) : null;
}
