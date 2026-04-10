/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {PageSetup, PageSize} from './types';
import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {RootNode} from 'lexical';
import {useCallback, useEffect, useState} from 'react';

import DropDown, {DropDownItem} from '../../ui/DropDown';
import {DEFAULT_PAGE_SETUP, PAGE_SIZES} from './constants';
import {$getPageSetup, $setPageSetup} from './pageSetup';

function dropDownActiveClass(active: boolean): string {
  return active ? 'active dropdown-item-active' : '';
}

function marginsEqual(
  a: PageSetup['margins'],
  b: PageSetup['margins'],
): boolean {
  const e = 0.001;
  return (
    Math.abs(a.top - b.top) < e &&
    Math.abs(a.right - b.right) < e &&
    Math.abs(a.bottom - b.bottom) < e &&
    Math.abs(a.left - b.left) < e
  );
}

const MARGIN_PRESETS: ReadonlyArray<{
  label: string;
  margins: PageSetup['margins'];
}> = [
  {
    label: 'Narrow (0.25")',
    margins: {bottom: 0.25, left: 0.25, right: 0.25, top: 0.25},
  },
  {
    label: 'Normal (0.4")',
    margins: structuredClone(DEFAULT_PAGE_SETUP.margins),
  },
  {
    label: 'Moderate (0.75")',
    margins: {bottom: 0.75, left: 0.75, right: 0.75, top: 0.75},
  },
  {
    label: 'Wide (1")',
    margins: {bottom: 1, left: 1, right: 1, top: 1},
  },
];

const PAGE_SIZE_ORDER: PageSize[] = [
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

export type PageSetupDropdownProps = {
  disabled?: boolean;
};

/**
 * Output component for {@link PageExtension}. Render via
 * {@link @lexical/react/ExtensionComponent | ExtensionComponent} or
 * {@link @lexical/react/useExtensionComponent | useExtensionComponent}.
 */
export function PageSetupDropdownComponent({
  disabled = false,
}: PageSetupDropdownProps): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [pageSetup, setPageSetup] = useState<PageSetup | null>(null);
  const [pageSizeMenuOpen, setPageSizeMenuOpen] = useState(true);
  const [orientationMenuOpen, setOrientationMenuOpen] = useState(false);
  const [marginsMenuOpen, setMarginsMenuOpen] = useState(false);

  const updatePageSetup = useCallback(() => {
    const newPageSetup = editor.getEditorState().read($getPageSetup);
    setPageSetup(newPageSetup);
    setOrientationMenuOpen(newPageSetup !== null);
    setMarginsMenuOpen(newPageSetup !== null);
  }, [editor]);
  useEffect(() => {
    updatePageSetup();
    return editor.registerMutationListener(RootNode, updatePageSetup);
  }, [editor, updatePageSetup]);

  const applyUpdate = useCallback(
    (v: null | Partial<PageSetup>) => {
      editor.update(() => {
        $setPageSetup(
          v ? (prev) => ({...(prev || DEFAULT_PAGE_SETUP), ...v}) : v,
        );
      });
    },
    [editor],
  );

  return (
    <DropDown
      disabled={disabled}
      buttonClassName="toolbar-item page-setup"
      buttonIconClassName="icon page-setup"
      buttonAriaLabel="Page setup: size, orientation, and layout">
      <DropDownItem
        className={`item wide dropdown-submenu-trigger ${pageSizeMenuOpen ? 'expanded' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          setPageSizeMenuOpen((open) => !open);
        }}>
        <span className="text">Page size</span>
        <i className="chevron-down dropdown-submenu-chevron" />
      </DropDownItem>
      {pageSizeMenuOpen ? (
        <>
          <DropDownItem
            className={`item wide dropdown-submenu-item ${dropDownActiveClass(pageSetup === null)}`}
            onClick={() => {
              applyUpdate(null);
            }}>
            <span className="text">Continuous</span>
          </DropDownItem>
          {PAGE_SIZE_ORDER.map((size) => (
            <DropDownItem
              key={size}
              className={`item wide dropdown-submenu-item ${dropDownActiveClass(
                pageSetup?.pageSize === size,
              )}`}
              onClick={() => {
                applyUpdate({pageSize: size});
              }}>
              <span className="text">{PAGE_SIZES[size].label}</span>
            </DropDownItem>
          ))}
        </>
      ) : null}
      <DropDownItem
        className={`item wide dropdown-submenu-trigger ${
          orientationMenuOpen ? 'expanded' : ''
        }`}
        onClick={(event) => {
          event.stopPropagation();
          setOrientationMenuOpen((open) => !open);
        }}>
        <span className="text">Orientation</span>
        <i className="chevron-down dropdown-submenu-chevron" />
      </DropDownItem>
      {orientationMenuOpen ? (
        <>
          <DropDownItem
            className={`item wide dropdown-submenu-item ${dropDownActiveClass(
              pageSetup?.orientation === 'portrait',
            )}`}
            onClick={() => {
              applyUpdate({orientation: 'portrait'});
            }}>
            <span className="text">Portrait</span>
          </DropDownItem>
          <DropDownItem
            className={`item wide dropdown-submenu-item ${dropDownActiveClass(
              pageSetup?.orientation === 'landscape',
            )}`}
            onClick={() => {
              applyUpdate({orientation: 'landscape'});
            }}>
            <span className="text">Landscape</span>
          </DropDownItem>
        </>
      ) : null}
      <DropDownItem
        className={`item wide dropdown-submenu-trigger ${
          marginsMenuOpen ? 'expanded' : ''
        }`}
        onClick={(event) => {
          event.stopPropagation();
          setMarginsMenuOpen((open) => !open);
        }}
        title="Page margins (all sides)">
        <span className="text">Margins</span>
        <i className="chevron-down dropdown-submenu-chevron" />
      </DropDownItem>
      {marginsMenuOpen
        ? MARGIN_PRESETS.map((preset) => (
            <DropDownItem
              key={preset.label}
              className={`item wide dropdown-submenu-item ${dropDownActiveClass(
                marginsEqual(
                  pageSetup?.margins ?? DEFAULT_PAGE_SETUP.margins,
                  preset.margins,
                ),
              )}`}
              onClick={() => {
                applyUpdate({margins: preset.margins});
              }}>
              <span className="text">{preset.label}</span>
            </DropDownItem>
          ))
        : null}
    </DropDown>
  );
}
