/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import * as React from 'react';
import {type JSX} from 'react';

import useModal from '../../hooks/useModal';
import {PageSetupDialog} from './PageSetupDialog';

export type PageSetupComponentProps = {
  disabled?: boolean;
};

/**
 * Toolbar entry point for {@link PagesExtension}: a button that opens the
 * {@link PageSetupDialog}. Render via
 * {@link @lexical/react/ExtensionComponent | ExtensionComponent} or
 * {@link @lexical/react/useExtensionComponent | useExtensionComponent}.
 */
export function PageSetupComponent({
  disabled = false,
}: PageSetupComponentProps): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [modal, showModal] = useModal();
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        className="toolbar-item page-setup"
        aria-label="Page setup: size, orientation, margins, headers and footers"
        title="Page setup"
        onClick={() =>
          showModal('Page setup', () => <PageSetupDialog editor={editor} />)
        }>
        <span className="icon page-setup" />
      </button>
      {modal}
    </>
  );
}
