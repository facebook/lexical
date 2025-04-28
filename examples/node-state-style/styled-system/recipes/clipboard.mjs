import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const clipboardDefaultVariants = {};
const clipboardCompoundVariants = [];

const clipboardSlotNames = [
  ['root', 'clipboard__root'],
  ['control', 'clipboard__control'],
  ['trigger', 'clipboard__trigger'],
  ['indicator', 'clipboard__indicator'],
  ['input', 'clipboard__input'],
  ['label', 'clipboard__label'],
];
const clipboardSlotFns = /* @__PURE__ */ clipboardSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      clipboardDefaultVariants,
      getSlotCompoundVariant(clipboardCompoundVariants, slotName),
    ),
  ],
);

const clipboardFn = memo((props = {}) => {
  return Object.fromEntries(
    clipboardSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const clipboardVariantKeys = [];
const getVariantProps = (variants) => ({
  ...clipboardDefaultVariants,
  ...compact(variants),
});

export const clipboard = /* @__PURE__ */ Object.assign(clipboardFn, {
  __recipe__: false,
  __name__: 'clipboard',
  raw: (props) => props,
  variantKeys: clipboardVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, clipboardVariantKeys);
  },
  getVariantProps,
});
