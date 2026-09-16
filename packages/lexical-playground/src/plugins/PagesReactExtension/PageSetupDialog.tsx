/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {
  Orientation,
  PageSetup,
  PageSize,
  PageSlotKind,
  PageSlotSetup,
  PageSlotVariant,
} from '../PagesExtension/types';

import './PageSetupDialog.css';

import {useExtensionSignalValue} from '@lexical/react/useExtensionSignalValue';
import {
  $addUpdateTag,
  type LexicalEditor,
  SKIP_DOM_SELECTION_TAG,
} from 'lexical';
import * as React from 'react';
import {type JSX, useCallback, useEffect, useRef, useState} from 'react';

import Button from '../../ui/Button';
import Select from '../../ui/Select';
import Switch from '../../ui/Switch';
import {DEFAULT_PAGE_SETUP, PAGE_SIZES} from '../PagesExtension/constants';
import {
  EDIT_PAGE_SLOT_COMMAND,
  resolveSlotVariant,
} from '../PagesExtension/headerFooter';
import {$setPageSetup} from '../PagesExtension/pageSetup';
import {PagesExtension} from '../PagesExtension/PagesExtension';

export const PAGE_SIZE_ORDER: PageSize[] = [
  'A4',
  'Letter',
  'Legal',
  'Tabloid',
  'A3',
  'A5',
  'B4',
  'B5',
  'Statement',
  'Executive',
  'Folio',
];

type MarginSide = keyof PageSetup['margins'];
const MARGIN_SIDES: {label: string; side: MarginSide}[] = [
  {label: 'Top', side: 'top'},
  {label: 'Right', side: 'right'},
  {label: 'Bottom', side: 'bottom'},
  {label: 'Left', side: 'left'},
];

function MarginInput({
  label,
  onChange,
  side,
  value,
}: {
  label: string;
  onChange: (next: number) => void;
  side: MarginSide;
  value: number;
}): JSX.Element {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    // Reflect external changes (undo, collaboration) without clobbering a
    // value that is being typed and already parses to the same number.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(prev => (parseFloat(prev) === value ? prev : String(value)));
  }, [value]);
  const id = `page-margin-${side}`;
  return (
    <div className="PageSetupDialog__margin">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        data-test-id={id}
        type="number"
        min={0}
        step={0.1}
        value={text}
        onChange={e => {
          setText(e.target.value);
          const parsed = parseFloat(e.target.value);
          if (Number.isFinite(parsed) && parsed >= 0 && parsed !== value) {
            onChange(parsed);
          }
        }}
      />
    </div>
  );
}

const VARIANT_LABELS: Record<PageSlotVariant, string> = {
  default: '',
  even: 'even pages ',
  first: 'first page ',
};

/** A page currently showing `variant` must exist for it to be editable. */
function hasPageForVariant(
  setup: PageSlotSetup,
  variant: PageSlotVariant,
  pageCount: number,
): boolean {
  for (let i = 0; i < pageCount; i++) {
    if (resolveSlotVariant(setup, i) === variant) {
      return true;
    }
  }
  return false;
}

function SlotSection({
  kind,
  onChange,
  onEdit,
  pageCount,
  setup,
}: {
  kind: PageSlotKind;
  onChange: (patch: Partial<PageSlotSetup>) => void;
  onEdit: (variant: PageSlotVariant) => void;
  pageCount: number;
  setup: PageSlotSetup;
}): JSX.Element {
  const title = kind === 'header' ? 'Headers' : 'Footers';
  const noun = kind === 'header' ? 'header' : 'footer';
  const variants: PageSlotVariant[] = ['default'];
  if (setup.differentFirstPage) {
    variants.push('first');
  }
  if (setup.differentEvenPages) {
    variants.push('even');
  }
  return (
    <div className="PageSetupDialog__section">
      <div className="PageSetupDialog__toggle">
        <Switch
          id={`page-${kind}-toggle`}
          text={title}
          checked={setup.enabled}
          onClick={() => onChange({enabled: !setup.enabled})}
        />
      </div>
      <p className="PageSetupDialog__hint">Show {noun} on each page.</p>
      {setup.enabled ? (
        <div className="PageSetupDialog__section PageSetupDialog__section--sub">
          <div className="PageSetupDialog__toggle PageSetupDialog__toggle--sub">
            <Switch
              id={`page-${kind}-first`}
              text="Different first page"
              checked={setup.differentFirstPage}
              onClick={() =>
                onChange({differentFirstPage: !setup.differentFirstPage})
              }
            />
          </div>
          <p className="PageSetupDialog__hint">
            Use a different {noun} on the first page.
          </p>
          <div className="PageSetupDialog__toggle PageSetupDialog__toggle--sub">
            <Switch
              id={`page-${kind}-even`}
              text="Different even pages"
              checked={setup.differentEvenPages}
              onClick={() =>
                onChange({differentEvenPages: !setup.differentEvenPages})
              }
            />
          </div>
          <p className="PageSetupDialog__hint">
            Use a different {noun} on even pages.
          </p>
          <div className="PageSetupDialog__actions">
            {variants.map(variant => {
              const available = hasPageForVariant(setup, variant, pageCount);
              return (
                <Button
                  key={variant}
                  small={true}
                  disabled={!available}
                  title={
                    available
                      ? undefined
                      : `The document has no page that shows the ${VARIANT_LABELS[variant]}${noun} yet`
                  }
                  data-test-id={`page-${kind}-edit-${variant}`}
                  onClick={() => onEdit(variant)}>
                  Edit {VARIANT_LABELS[variant]}
                  {noun}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type PageSetupDialogProps = {
  editor: LexicalEditor;
  /** Called when the dialog wants to close itself (after "Edit header"). */
  onClose?: () => void;
};

/**
 * Page settings panel. Every control applies immediately through
 * {@link $setPageSetup}; the values shown come from the extension's
 * `pageSetup` signal, so undo and collaboration changes are reflected live.
 */
export function PageSetupDialog({
  editor,
  onClose,
}: PageSetupDialogProps): JSX.Element {
  const pageSetup = useExtensionSignalValue(PagesExtension, 'pageSetup');
  const pageCount = useExtensionSignalValue(PagesExtension, 'pageCount');
  // The last paged setup, so turning "Paged" off and on restores it.
  const lastPagedSetup = useRef<PageSetup>(pageSetup ?? DEFAULT_PAGE_SETUP);
  if (pageSetup !== null) {
    lastPagedSetup.current = pageSetup;
  }
  // While pageless the other controls are disabled and show the last paged
  // setup, so turning "Paged" back on restores what the user had.
  const paged = pageSetup !== null;
  const shown = pageSetup ?? lastPagedSetup.current;

  // The dialog's controls keep focus: without the tag, reconciliation would
  // re-apply the editor's DOM selection and pull focus out of the modal.
  const applyUpdate = useCallback(
    (patch: null | Partial<PageSetup>) => {
      editor.update(() => {
        $addUpdateTag(SKIP_DOM_SELECTION_TAG);
        $setPageSetup(
          patch === null
            ? null
            : prev => ({...(prev ?? lastPagedSetup.current), ...patch}),
        );
      });
    },
    [editor],
  );
  const editSlot = useCallback(
    (kind: PageSlotKind, variant: PageSlotVariant) => {
      onClose?.();
      editor.dispatchCommand(EDIT_PAGE_SLOT_COMMAND, {kind, variant});
    },
    [editor, onClose],
  );
  const updateSlot = useCallback(
    (kind: PageSlotKind, patch: Partial<PageSlotSetup>) => {
      editor.update(() => {
        $addUpdateTag(SKIP_DOM_SELECTION_TAG);
        $setPageSetup(prev => {
          const base = prev ?? lastPagedSetup.current;
          return {...base, [kind]: {...base[kind], ...patch}};
        });
      });
    },
    [editor],
  );

  return (
    <div className="PageSetupDialog">
      <div className="PageSetupDialog__section">
        <div className="PageSetupDialog__toggle">
          <Switch
            id="paged-toggle"
            text="Paged"
            checked={paged}
            onClick={() => applyUpdate(paged ? null : lastPagedSetup.current)}
          />
        </div>
        <p className="PageSetupDialog__hint">
          {paged
            ? 'Document uses pages with defined size and margins'
            : 'Document is pageless and flows continuously'}
        </p>
      </div>

      <fieldset
        className="PageSetupDialog__paged"
        disabled={!paged}
        aria-label="Page settings">
        <div className="PageSetupDialog__section PageSetupDialog__section--paged">
          <Select
            label="Page Size"
            id="page-size"
            data-test-id="page-size"
            value={shown.pageSize}
            onChange={e => applyUpdate({pageSize: e.target.value as PageSize})}>
            {PAGE_SIZE_ORDER.map(size => (
              <option key={size} value={size}>
                {PAGE_SIZES[size].label}
              </option>
            ))}
          </Select>
        </div>

        <div className="PageSetupDialog__section PageSetupDialog__section--paged">
          <Select
            label="Orientation"
            id="page-orientation"
            data-test-id="page-orientation"
            value={shown.orientation}
            onChange={e =>
              applyUpdate({orientation: e.target.value as Orientation})
            }>
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </Select>
        </div>

        <div className="PageSetupDialog__section PageSetupDialog__section--paged">
          <label className="PageSetupDialog__label">Margins (inches)</label>
          <div className="PageSetupDialog__grid">
            {MARGIN_SIDES.map(({label, side}) => (
              <MarginInput
                key={side}
                side={side}
                label={label}
                value={shown.margins[side]}
                onChange={value =>
                  applyUpdate({margins: {...shown.margins, [side]: value}})
                }
              />
            ))}
          </div>
        </div>

        <div className="PageSetupDialog__section--paged">
          <SlotSection
            kind="header"
            setup={shown.header}
            onChange={patch => updateSlot('header', patch)}
            onEdit={variant => editSlot('header', variant)}
            pageCount={pageCount}
          />
        </div>
        <div className="PageSetupDialog__section--paged">
          <SlotSection
            kind="footer"
            setup={shown.footer}
            onChange={patch => updateSlot('footer', patch)}
            onEdit={variant => editSlot('footer', variant)}
            pageCount={pageCount}
          />
        </div>
      </fieldset>
    </div>
  );
}
