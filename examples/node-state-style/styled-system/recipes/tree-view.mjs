import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const treeViewDefaultVariants = {};
const treeViewCompoundVariants = [];

const treeViewSlotNames = [
  ['root', 'treeView__root'],
  ['label', 'treeView__label'],
  ['tree', 'treeView__tree'],
  ['item', 'treeView__item'],
  ['itemIndicator', 'treeView__itemIndicator'],
  ['itemText', 'treeView__itemText'],
  ['branch', 'treeView__branch'],
  ['branchControl', 'treeView__branchControl'],
  ['branchTrigger', 'treeView__branchTrigger'],
  ['branchContent', 'treeView__branchContent'],
  ['branchText', 'treeView__branchText'],
  ['branchIndicator', 'treeView__branchIndicator'],
  ['branchIndentGuide', 'treeView__branchIndentGuide'],
];
const treeViewSlotFns = /* @__PURE__ */ treeViewSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      treeViewDefaultVariants,
      getSlotCompoundVariant(treeViewCompoundVariants, slotName),
    ),
  ],
);

const treeViewFn = memo((props = {}) => {
  return Object.fromEntries(
    treeViewSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const treeViewVariantKeys = [];
const getVariantProps = (variants) => ({
  ...treeViewDefaultVariants,
  ...compact(variants),
});

export const treeView = /* @__PURE__ */ Object.assign(treeViewFn, {
  __recipe__: false,
  __name__: 'treeView',
  raw: (props) => props,
  variantKeys: treeViewVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, treeViewVariantKeys);
  },
  getVariantProps,
});
