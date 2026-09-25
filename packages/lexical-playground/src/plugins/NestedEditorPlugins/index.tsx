/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  getPeerDependencyFromEditor,
  NestedEditorExtension,
} from '@lexical/extension';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {type LexicalEditor} from 'lexical';
import {type JSX, useCallback, useEffect, useMemo, useState} from 'react';

import AutoEmbedPlugin from '../AutoEmbedPlugin';
import CodeActionMenuPlugin from '../CodeActionMenuPlugin';
import ComponentPickerPlugin from '../ComponentPickerPlugin';
import DraggableBlockPlugin from '../DraggableBlockPlugin';
import EmojiPickerPlugin from '../EmojiPickerPlugin';
import {ExcalidrawPlugin} from '../ExcalidrawExtension';
import FloatingTextFormatToolbarPlugin from '../FloatingTextFormatToolbarPlugin';
import {MentionsPlugin} from '../MentionsExtension';
import {ShortcutsExtension} from '../ShortcutsExtension';
import TableCellActionMenuPlugin from '../TableActionMenuPlugin';
import TableCellResizer from '../TableCellResizer';
import TableHoverActionsV2Plugin from '../TableHoverActionsV2Plugin';
import TableScrollShadowPlugin from '../TableScrollShadowPlugin';

/** The document editor a nested editor was built for, if any. */
function useParentEditor(editor: LexicalEditor): LexicalEditor | null {
  return useMemo(() => {
    const nested = getPeerDependencyFromEditor<typeof NestedEditorExtension>(
      editor,
      NestedEditorExtension.name,
    );
    // 'latest' reads without flushing pending updates, which a render must
    // not do.
    return nested === undefined
      ? null
      : editor.read('latest', () => nested.config.$getParentEditor());
  }, [editor]);
}

/**
 * The element the document's floating UI anchors to (`.editor` in
 * Editor.tsx), so the nested editor's floating UI shares its coordinate
 * space and stacking.
 */
function useDocumentAnchor(parent: LexicalEditor | null): HTMLElement | null {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (parent === null) {
      return;
    }
    return parent.registerRootListener(root => {
      setAnchor(root === null ? null : root.closest<HTMLElement>('.editor'));
    });
  }, [parent]);
  return anchor;
}

/**
 * The playground's React plugins for a nested editor (a page header or
 * footer): everything the document gets in Editor.tsx that makes sense
 * inside a header. Rendered through the editor's `ReactExtension`
 * decorators, so it needs no composer of its own.
 *
 * Left out on purpose: the toolbar, the floating link and ruby editors and
 * the keyboard shortcuts (the document's follow the active editor), and
 * document-level features such as comments, find/replace, the table of
 * contents, sticky notes and pages.
 */
export function NestedEditorPlugins(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const parent = useParentEditor(editor);
  const anchorElem = useDocumentAnchor(parent);
  // The document's floating link editor follows the active editor; its
  // edit mode lives on the document's ShortcutsExtension.
  const setIsLinkEditMode = useCallback(
    (next: boolean) => {
      const shortcuts =
        parent === null
          ? undefined
          : getPeerDependencyFromEditor<typeof ShortcutsExtension>(
              parent,
              ShortcutsExtension.name,
            );
      if (shortcuts !== undefined) {
        shortcuts.output.isLinkEditMode.value = next;
      }
    },
    [parent],
  );
  return (
    <>
      <ComponentPickerPlugin />
      <EmojiPickerPlugin />
      <AutoEmbedPlugin />
      <MentionsPlugin />
      <TableCellResizer />
      <TableScrollShadowPlugin />
      <ExcalidrawPlugin />
      {anchorElem !== null && (
        <>
          <TableCellActionMenuPlugin anchorElem={anchorElem} cellMerge={true} />
          <DraggableBlockPlugin anchorElem={anchorElem} />
          <CodeActionMenuPlugin anchorElem={anchorElem} />
          <TableHoverActionsV2Plugin anchorElem={anchorElem} />
          <FloatingTextFormatToolbarPlugin
            anchorElem={anchorElem}
            setIsLinkEditMode={setIsLinkEditMode}
          />
        </>
      )}
    </>
  );
}

/** `ReactExtension` decorator form of {@link NestedEditorPlugins}. */
export function NestedEditorPluginsDecorator(): JSX.Element {
  return <NestedEditorPlugins />;
}
