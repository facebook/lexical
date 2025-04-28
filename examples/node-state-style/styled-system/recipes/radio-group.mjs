import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const radioGroupDefaultVariants = {
  size: 'md',
};
const radioGroupCompoundVariants = [];

const radioGroupSlotNames = [
  ['root', 'radioGroup__root'],
  ['label', 'radioGroup__label'],
  ['item', 'radioGroup__item'],
  ['itemText', 'radioGroup__itemText'],
  ['itemControl', 'radioGroup__itemControl'],
  ['indicator', 'radioGroup__indicator'],
];
const radioGroupSlotFns = /* @__PURE__ */ radioGroupSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      radioGroupDefaultVariants,
      getSlotCompoundVariant(radioGroupCompoundVariants, slotName),
    ),
  ],
);

const radioGroupFn = memo((props = {}) => {
  return Object.fromEntries(
    radioGroupSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const radioGroupVariantKeys = ['size'];
const getVariantProps = (variants) => ({
  ...radioGroupDefaultVariants,
  ...compact(variants),
});

export const radioGroup = /* @__PURE__ */ Object.assign(radioGroupFn, {
  __recipe__: false,
  __name__: 'radioGroup',
  raw: (props) => props,
  variantKeys: radioGroupVariantKeys,
  variantMap: {
    size: ['sm', 'md', 'lg'],
  },
  splitVariantProps(props) {
    return splitProps(props, radioGroupVariantKeys);
  },
  getVariantProps,
});
