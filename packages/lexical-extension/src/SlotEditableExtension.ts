/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {defineExtension} from 'lexical';

/**
 * Keeps named-slot editable islands in sync with the editor's editable state.
 *
 * The reconciler renders a slot inside a non-editable host — a DecoratorNode,
 * or an element shell that renders chrome around editable islands — as its own
 * `contentEditable` container so it stays editable inside that host. By default
 * such a container *follows* the editor's editable state: it is created with
 * the right initial value and tagged `data-lexical-slot-editable="<editorKey>"`.
 * This extension flips those tagged containers whenever {@link
 * LexicalEditor.setEditable} toggles, so a read-only editor's slots are not
 * editable.
 *
 * The tag carries the owning editor's key so the query is scoped to this
 * editor: a nested editor's slot containers live inside the same root DOM but
 * must not change with the outer editor's editable state.
 *
 * Containers pinned to a fixed value via
 * `EditorDOMRenderConfig.$getSlotEditable` are left untagged, so this extension
 * leaves them alone. Apps that drive other editable islands the same way (e.g.
 * a `getDOMSlot` children element) can opt them in by tagging them with the
 * same attribute and editor key.
 */
export const SlotEditableExtension = /* @__PURE__ */ defineExtension({
  name: '@lexical/extension/SlotEditable',
  register: editor =>
    editor.registerEditableListener(editable => {
      const root = editor.getRootElement();
      if (root === null) {
        return;
      }
      const value = editable ? 'true' : 'false';
      root
        .querySelectorAll<HTMLElement>(
          `[data-lexical-slot-editable="${editor.getKey()}"]`,
        )
        .forEach(container => {
          container.contentEditable = value;
        });
    }),
});
