import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const radioButtonGroupDefaultVariants = {
  size: 'md',
  variant: 'solid',
};
const radioButtonGroupCompoundVariants = [];

const radioButtonGroupSlotNames = [
  ['root', 'radioButtonGroup__root'],
  ['label', 'radioButtonGroup__label'],
  ['item', 'radioButtonGroup__item'],
  ['itemText', 'radioButtonGroup__itemText'],
  ['itemControl', 'radioButtonGroup__itemControl'],
  ['indicator', 'radioButtonGroup__indicator'],
];
const radioButtonGroupSlotFns = /* @__PURE__ */ radioButtonGroupSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      radioButtonGroupDefaultVariants,
      getSlotCompoundVariant(radioButtonGroupCompoundVariants, slotName),
    ),
  ],
);

const radioButtonGroupFn = memo((props = {}) => {
  return Object.fromEntries(
    radioButtonGroupSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const radioButtonGroupVariantKeys = ['variant', 'size'];
const getVariantProps = (variants) => ({
  ...radioButtonGroupDefaultVariants,
  ...compact(variants),
});

export const radioButtonGroup = /* @__PURE__ */ Object.assign(
  radioButtonGroupFn,
  {
    __recipe__: false,
    __name__: 'radioButtonGroup',
    raw: (props) => props,
    variantKeys: radioButtonGroupVariantKeys,
    variantMap: {
      variant: ['solid', 'outline'],
      size: ['sm', 'md', 'lg', 'xl'],
    },
    splitVariantProps(props) {
      return splitProps(props, radioButtonGroupVariantKeys);
    },
    getVariantProps,
  },
);
