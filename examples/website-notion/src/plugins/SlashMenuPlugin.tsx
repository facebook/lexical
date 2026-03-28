/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {TextNode} from 'lexical';
import {useCallback, useMemo, useState} from 'react';
import * as ReactDOM from 'react-dom';

import {BlockOption, getBlockOptions, ICON_URLS} from './blockOptions';

export function SlashMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);

  const options = useMemo(() => {
    const base = getBlockOptions(editor);
    if (!queryString) {
      return base;
    }
    const regex = new RegExp(queryString, 'i');
    return base.filter(
      (o) => regex.test(o.title) || o.keywords.some((k) => regex.test(k)),
    );
  }, [editor, queryString]);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    allowWhitespace: true,
    minLength: 0,
  });

  const onSelectOption = useCallback(
    (
      selectedOption: BlockOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
    ) => {
      editor.update(() => {
        if (nodeToRemove !== null) {
          nodeToRemove.remove();
        }
        selectedOption.onSelect();
        closeMenu();
      });
    },
    [editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin<BlockOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      menuRenderFn={(
        anchorRef,
        {selectedIndex, selectOptionAndCleanUp, setHighlightedIndex},
      ) =>
        anchorRef.current
          ? ReactDOM.createPortal(
              <div className="w-[220px] overflow-hidden rounded-lg border border-solid border-zinc-200 bg-white text-[#1c1e21] shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:border-zinc-700 dark:bg-[#232325] dark:text-[#e3e3e3] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                <ul className="m-0 max-h-[220px] list-none overflow-y-auto p-1">
                  {options.map((option, i) => (
                    <li
                      key={option.key}
                      ref={option.setRefElement}
                      role="option"
                      aria-selected={selectedIndex === i}
                      className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-inherit ${selectedIndex === i ? 'bg-zinc-100 dark:bg-[#3a3a3c]' : 'hover:bg-zinc-100 dark:hover:bg-[#3a3a3c]'}`}
                      tabIndex={-1}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      onClick={() => {
                        setHighlightedIndex(i);
                        selectOptionAndCleanUp(option);
                      }}>
                      <span
                        className="inline-block h-4 w-4 shrink-0 [background-size:contain] bg-center bg-no-repeat opacity-70 dark:invert"
                        style={{
                          backgroundImage: `url('${ICON_URLS[option.iconKey]}')`,
                        }}
                      />
                      <span className="flex-1">{option.title}</span>
                    </li>
                  ))}
                </ul>
              </div>,
              anchorRef.current,
            )
          : null
      }
    />
  );
}
