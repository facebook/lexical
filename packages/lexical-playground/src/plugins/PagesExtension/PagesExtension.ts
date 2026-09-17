/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {ActivePageSlot} from './types';

import './index.css';

import {
  computed,
  effect,
  namedSignals,
  RootElementExtension,
  signal,
  watchedSignal,
} from '@lexical/extension';
import {
  defineExtension,
  type LexicalEditor,
  mergeRegister,
  RootNode,
  safeCast,
} from 'lexical';

import {PageBreakExtension} from '../PageBreakExtension';
import {PAGE_GAP} from './constants';
import {buildHeaderFooterEditor, type SlotEditorBuilder} from './headerFooter';
import {HeaderFooterSession} from './HeaderFooterSession';
import {$getPageSetup} from './pageSetup';
import {PagesLayout} from './PagesLayout';
import {registerPrintHandlers} from './print';

export interface PagesConfig {
  /**
   * Builds the nested editor behind each header/footer variant. The default
   * supports rich text, links and page numbers; the playground passes a
   * builder with its full feature set.
   */
  buildSlotEditor: SlotEditorBuilder;
  /** Hide the page layer without touching the document or the page setup. */
  disabled: boolean;
  /** Visual gap between pages, in CSS px. */
  gap: number;
}

/**
 * Paginated view of the document.
 *
 * The document stays flat (`root > blocks`); the page setup lives in
 * {@link pageSetupState} on the root and the pages themselves are drawn by
 * {@link PagesLayout} as non-editable DOM next to the editor root. Nothing in
 * this extension mutates the document to lay out pages, so typing in paged
 * mode costs the same as pageless mode and collaborators, undo history and
 * serialized documents never see pages. Header and footer content is stored
 * on the root as well and rendered by {@link HeaderFooterSession}.
 */
export const PagesExtension = defineExtension({
  build: (editor, config) => {
    const getPageSetup = () => editor.read('latest', $getPageSetup);
    return {
      ...namedSignals({disabled: config.disabled}),
      /** The header/footer slot open for editing, if any. */
      activeSlot: signal<ActivePageSlot | null>(null),
      /** The nested editor of the open header/footer slot, if any. */
      activeSlotEditor: signal<LexicalEditor | null>(null),
      /** The element hosting the page layer while paged, else null. */
      hostElement: signal<HTMLElement | null>(null),
      /** Number of pages currently rendered (1 while pageless). */
      pageCount: signal(1),
      pageSetup: watchedSignal(getPageSetup, pageSetupSignal =>
        editor.registerMutationListener(RootNode, () => {
          pageSetupSignal.value = getPageSetup();
        }),
      ),
    };
  },
  config: safeCast<PagesConfig>({
    buildSlotEditor: buildHeaderFooterEditor,
    disabled: false,
    gap: PAGE_GAP,
  }),
  dependencies: [PageBreakExtension, RootElementExtension],
  name: '@lexical/playground/Pages',
  register: (editor, config, state) => {
    const output = state.getOutput();
    const rootElement = state.getDependency(RootElementExtension).output;
    const paged = computed(() => output.pageSetup.value !== null);
    return effect(() => {
      const root = rootElement.value;
      if (root === null || output.disabled.value || !paged.value) {
        return;
      }
      const layout = new PagesLayout(editor, root, {
        gap: config.gap,
        onPageCountChange: pageCount => {
          output.pageCount.value = pageCount;
        },
      });
      const session = new HeaderFooterSession(editor, layout, {
        activeSlot: output.activeSlot,
        activeSlotEditor: output.activeSlotEditor,
        buildSlotEditor: config.buildSlotEditor,
      });
      output.hostElement.value = layout.host;
      return mergeRegister(
        // Innermost first: mergeRegister tears down in reverse order.
        () => {
          output.hostElement.value = null;
        },
        () => layout.dispose(),
        () => session.dispose(),
        registerPrintHandlers(layout),
        effect(() => {
          const pageSetup = output.pageSetup.value;
          if (pageSetup !== null) {
            layout.setPageSetup(pageSetup);
            session.setPageSetup(pageSetup);
          }
        }),
      );
    });
  },
});
