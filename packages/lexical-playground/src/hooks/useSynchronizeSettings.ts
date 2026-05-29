/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {AnyLexicalExtension} from 'lexical';

import {
  batch,
  getPeerDependencyFromEditor,
  SelectionAlwaysOnDisplayExtension,
} from '@lexical/extension';
import {
  ClickableLinkExtension,
  LinkAttributes,
  LinkExtension,
} from '@lexical/link';
import {CheckListExtension, ListExtension} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalEditable} from '@lexical/react/useLexicalEditable';
import {TableExtension} from '@lexical/table';
import {useEffect} from 'react';

import {useSettings} from '../context/SettingsContext';
import {AutocompleteExtension} from '../plugins/AutocompleteExtension';
import {CodeHighlightExtension} from '../plugins/CodeHighlightExtension';
import {MaxLengthExtension} from '../plugins/MaxLengthPlugin';
import {SpecialTextExtension} from '../plugins/SpecialTextExtension';
import {VisibleLineBreakExtension} from '../plugins/VisibleLineBreakExtension';

const DEFAULT_LINK_ATTRIBUTES: LinkAttributes = {
  rel: 'noopener noreferrer',
  target: '_blank',
};

/**
 * Mirror the playground's settings context onto the live editor's reactive
 * extension config signals. These are deliberately kept OUT of App.tsx's
 * DynamicSettings (which would rebuild the whole editor); they are applied
 * here without recreating the editor.
 *
 * A `@preact/signals-core` write is a no-op when the value is unchanged
 * (strict `!==`), so a single effect keyed only on the stable `settings`
 * object does work for exactly the signals that changed, and `batch`
 * coalesces the dependent extension effects (e.g. TableExtension's reconcile)
 * into one flush. Extension outputs are resolved in-effect with
 * `getPeerDependencyFromEditor` — the optional form — because some of these
 * extensions (CheckList, CodeHighlight, …) are absent in plain-text mode.
 */
export function useSynchronizeSettings(): void {
  const [editor] = useLexicalComposerContext();
  const {settings} = useSettings();
  // Clickable links are enabled only when the editor is read-only; editability
  // is editor state rather than a setting, so it is tracked reactively here.
  const isEditable = useLexicalEditable();

  useEffect(() => {
    const output = <Extension extends AnyLexicalExtension>(
      extension: Extension,
    ) => getPeerDependencyFromEditor<Extension>(editor, extension.name)?.output;
    batch(() => {
      const autocomplete = output(AutocompleteExtension);
      if (autocomplete) {
        autocomplete.disabled.value = !settings.isAutocomplete;
      }
      const visibleLineBreak = output(VisibleLineBreakExtension);
      if (visibleLineBreak) {
        visibleLineBreak.disabled.value = !settings.isVisibleLineBreak;
      }
      const maxLength = output(MaxLengthExtension);
      if (maxLength) {
        maxLength.disabled.value = !settings.isMaxLength;
      }
      const codeHighlight = output(CodeHighlightExtension);
      if (codeHighlight) {
        codeHighlight.mode.value = !settings.isCodeHighlighted
          ? 'off'
          : settings.isCodeShiki
            ? 'shiki'
            : 'prism';
      }
      const specialText = output(SpecialTextExtension);
      if (specialText) {
        specialText.disabled.value =
          !settings.shouldAllowHighlightingWithBrackets;
      }
      const link = output(LinkExtension);
      if (link) {
        link.attributes.value = settings.hasLinkAttributes
          ? DEFAULT_LINK_ATTRIBUTES
          : undefined;
      }
      const list = output(ListExtension);
      if (list) {
        list.hasStrictIndent.value = settings.listStrictIndent;
      }
      const table = output(TableExtension);
      if (table) {
        table.hasCellMerge.value = settings.tableCellMerge;
        table.hasCellBackgroundColor.value = settings.tableCellBackgroundColor;
        table.hasHorizontalScroll.value =
          settings.tableHorizontalScroll && !settings.hasFitNestedTables;
        table.hasNestedTables.value = settings.hasNestedTables;
      }
      const checkList = output(CheckListExtension);
      if (checkList) {
        checkList.disableTakeFocusOnClick.value =
          settings.shouldDisableFocusOnClickChecklist;
      }
      const clickableLink = output(ClickableLinkExtension);
      if (clickableLink) {
        clickableLink.disabled.value = isEditable;
      }
      const selectionDisplay = output(SelectionAlwaysOnDisplayExtension);
      if (selectionDisplay) {
        selectionDisplay.disabled.value = !settings.selectionAlwaysOnDisplay;
      }
    });
  }, [editor, settings, isEditable]);
}
