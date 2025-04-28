/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use client';
import type {Assign} from '@ark-ui/react';
import type {ComponentProps, HTMLStyledProps} from 'styled-system/types';

import {Combobox} from '@ark-ui/react/combobox';
import {combobox, type ComboboxVariantProps} from 'styled-system/recipes';

import {createStyleContext} from './utils/create-style-context';

const {withProvider, withContext} = createStyleContext(combobox);

export type RootProviderProps = ComponentProps<typeof RootProvider>;
export const RootProvider = withProvider<
  HTMLDivElement,
  Assign<
    Assign<
      HTMLStyledProps<'div'>,
      Combobox.RootProviderBaseProps<Combobox.CollectionItem>
    >,
    ComboboxVariantProps
  >
>(Combobox.RootProvider, 'root');

export type RootProps = ComponentProps<typeof Root>;
export const Root = withProvider<
  HTMLDivElement,
  Assign<
    Assign<
      HTMLStyledProps<'div'>,
      Combobox.RootBaseProps<Combobox.CollectionItem>
    >,
    ComboboxVariantProps
  >
>(Combobox.Root, 'root');

export const ClearTrigger = withContext<
  HTMLButtonElement,
  Assign<HTMLStyledProps<'button'>, Combobox.ClearTriggerBaseProps>
>(Combobox.ClearTrigger, 'clearTrigger');

export const Content = withContext<
  HTMLDivElement,
  Assign<HTMLStyledProps<'div'>, Combobox.ContentBaseProps>
>(Combobox.Content, 'content');

export const Control = withContext<
  HTMLDivElement,
  Assign<HTMLStyledProps<'div'>, Combobox.ControlBaseProps>
>(Combobox.Control, 'control');

export const Input = withContext<
  HTMLInputElement,
  Assign<HTMLStyledProps<'input'>, Combobox.InputBaseProps>
>(Combobox.Input, 'input');

export const ItemGroupLabel = withContext<
  HTMLDivElement,
  Assign<HTMLStyledProps<'div'>, Combobox.ItemGroupLabelBaseProps>
>(Combobox.ItemGroupLabel, 'itemGroupLabel');

export const ItemGroup = withContext<
  HTMLDivElement,
  Assign<HTMLStyledProps<'div'>, Combobox.ItemGroupBaseProps>
>(Combobox.ItemGroup, 'itemGroup');

export const ItemIndicator = withContext<
  HTMLDivElement,
  Assign<HTMLStyledProps<'div'>, Combobox.ItemIndicatorBaseProps>
>(Combobox.ItemIndicator, 'itemIndicator');

export const Item = withContext<
  HTMLDivElement,
  Assign<HTMLStyledProps<'div'>, Combobox.ItemBaseProps>
>(Combobox.Item, 'item');

export const ItemText = withContext<
  HTMLDivElement,
  Assign<HTMLStyledProps<'span'>, Combobox.ItemTextBaseProps>
>(Combobox.ItemText, 'itemText');

export const Label = withContext<
  HTMLLabelElement,
  Assign<HTMLStyledProps<'label'>, Combobox.LabelBaseProps>
>(Combobox.Label, 'label');

export const List = withContext<
  HTMLDivElement,
  Assign<HTMLStyledProps<'div'>, Combobox.ListBaseProps>
>(Combobox.List, 'list');

export const Positioner = withContext<
  HTMLDivElement,
  Assign<HTMLStyledProps<'div'>, Combobox.PositionerBaseProps>
>(Combobox.Positioner, 'positioner');

export const Trigger = withContext<
  HTMLButtonElement,
  Assign<HTMLStyledProps<'button'>, Combobox.TriggerBaseProps>
>(Combobox.Trigger, 'trigger');

export type {
  ComboboxHighlightChangeDetails as HighlightChangeDetails,
  ComboboxInputValueChangeDetails as InputValueChangeDetails,
  ComboboxOpenChangeDetails as OpenChangeDetails,
  ComboboxValueChangeDetails as ValueChangeDetails,
} from '@ark-ui/react/combobox';
export {ComboboxContext as Context} from '@ark-ui/react/combobox';
