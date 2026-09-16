/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useExtensionSignalValue} from '@lexical/react/useExtensionSignalValue';
import * as React from 'react';
import {type JSX} from 'react';

import useModal from '../../hooks/useModal';
import {
  CLOSE_PAGE_SLOT_COMMAND,
  INSERT_PAGE_COUNT_COMMAND,
  INSERT_PAGE_NUMBER_COMMAND,
  PagesExtension,
} from '../PagesExtension';
import {PageSetupDialog} from './PageSetupDialog';

export type PageSetupComponentProps = {
  disabled?: boolean;
};

/**
 * Toolbar entry point for {@link PagesExtension}: a button that opens the
 * {@link PageSetupDialog}, plus "Page number", "Page count" and "Done"
 * items while a header or footer is being edited. Render via
 * {@link @lexical/react/ExtensionComponent | ExtensionComponent} or
 * {@link @lexical/react/useExtensionComponent | useExtensionComponent}.
 */
export function PageSetupComponent({
  disabled = false,
}: PageSetupComponentProps): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [modal, showModal] = useModal();
  const activeSlot = useExtensionSignalValue(PagesExtension, 'activeSlot');
  const activeSlotEditor = useExtensionSignalValue(
    PagesExtension,
    'activeSlotEditor',
  );
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        className="toolbar-item page-setup"
        aria-label="Page setup: size, orientation, margins, headers and footers"
        title="Page setup"
        onClick={() =>
          showModal('Page setup', onClose => (
            <PageSetupDialog editor={editor} onClose={onClose} />
          ))
        }>
        <span className="icon page-setup" />
      </button>
      {activeSlot !== null && activeSlotEditor !== null ? (
        <>
          <button
            type="button"
            className="toolbar-item spaced"
            title="Insert page number"
            aria-label="Insert page number"
            onClick={() =>
              activeSlotEditor.dispatchCommand(
                INSERT_PAGE_NUMBER_COMMAND,
                undefined,
              )
            }>
            <span className="text">Page number</span>
          </button>
          <button
            type="button"
            className="toolbar-item spaced"
            title="Insert page count"
            aria-label="Insert page count"
            onClick={() =>
              activeSlotEditor.dispatchCommand(
                INSERT_PAGE_COUNT_COMMAND,
                undefined,
              )
            }>
            <span className="text">Page count</span>
          </button>
          <button
            type="button"
            className="toolbar-item spaced"
            title={`Finish editing the ${activeSlot.kind}`}
            aria-label={`Finish editing the ${activeSlot.kind}`}
            onClick={() =>
              editor.dispatchCommand(CLOSE_PAGE_SLOT_COMMAND, undefined)
            }>
            <span className="text">Done</span>
          </button>
        </>
      ) : null}
      {modal}
    </>
  );
}
