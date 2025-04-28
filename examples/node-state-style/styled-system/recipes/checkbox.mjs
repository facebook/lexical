import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const checkboxDefaultVariants = {
  size: 'md',
};
const checkboxCompoundVariants = [];

const checkboxSlotNames = [
  ['root', 'checkbox__root'],
  ['label', 'checkbox__label'],
  ['control', 'checkbox__control'],
  ['indicator', 'checkbox__indicator'],
  ['group', 'checkbox__group'],
];
const checkboxSlotFns = /* @__PURE__ */ checkboxSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      checkboxDefaultVariants,
      getSlotCompoundVariant(checkboxCompoundVariants, slotName),
    ),
  ],
);

const checkboxFn = memo((props = {}) => {
  return Object.fromEntries(
    checkboxSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const checkboxVariantKeys = ['size'];
const getVariantProps = (variants) => ({
  ...checkboxDefaultVariants,
  ...compact(variants),
});

export const checkbox = /* @__PURE__ */ Object.assign(checkboxFn, {
  __recipe__: false,
  __name__: 'checkbox',
  raw: (props) => props,
  variantKeys: checkboxVariantKeys,
  variantMap: {
    size: ['sm', 'md', 'lg'],
  },
  splitVariantProps(props) {
    return splitProps(props, checkboxVariantKeys);
  },
  getVariantProps,
});
