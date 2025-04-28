import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const pinInputDefaultVariants = {
  size: 'md',
};
const pinInputCompoundVariants = [];

const pinInputSlotNames = [
  ['root', 'pinInput__root'],
  ['label', 'pinInput__label'],
  ['input', 'pinInput__input'],
  ['control', 'pinInput__control'],
];
const pinInputSlotFns = /* @__PURE__ */ pinInputSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      pinInputDefaultVariants,
      getSlotCompoundVariant(pinInputCompoundVariants, slotName),
    ),
  ],
);

const pinInputFn = memo((props = {}) => {
  return Object.fromEntries(
    pinInputSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const pinInputVariantKeys = ['size'];
const getVariantProps = (variants) => ({
  ...pinInputDefaultVariants,
  ...compact(variants),
});

export const pinInput = /* @__PURE__ */ Object.assign(pinInputFn, {
  __recipe__: false,
  __name__: 'pinInput',
  raw: (props) => props,
  variantKeys: pinInputVariantKeys,
  variantMap: {
    size: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'],
  },
  splitVariantProps(props) {
    return splitProps(props, pinInputVariantKeys);
  },
  getVariantProps,
});
