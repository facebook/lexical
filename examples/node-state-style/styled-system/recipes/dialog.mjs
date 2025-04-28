import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const dialogDefaultVariants = {};
const dialogCompoundVariants = [];

const dialogSlotNames = [
  ['trigger', 'dialog__trigger'],
  ['backdrop', 'dialog__backdrop'],
  ['positioner', 'dialog__positioner'],
  ['content', 'dialog__content'],
  ['title', 'dialog__title'],
  ['description', 'dialog__description'],
  ['closeTrigger', 'dialog__closeTrigger'],
];
const dialogSlotFns = /* @__PURE__ */ dialogSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      dialogDefaultVariants,
      getSlotCompoundVariant(dialogCompoundVariants, slotName),
    ),
  ],
);

const dialogFn = memo((props = {}) => {
  return Object.fromEntries(
    dialogSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const dialogVariantKeys = [];
const getVariantProps = (variants) => ({
  ...dialogDefaultVariants,
  ...compact(variants),
});

export const dialog = /* @__PURE__ */ Object.assign(dialogFn, {
  __recipe__: false,
  __name__: 'dialog',
  raw: (props) => props,
  variantKeys: dialogVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, dialogVariantKeys);
  },
  getVariantProps,
});
