import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const toggleGroupDefaultVariants = {
  size: 'md',
  variant: 'outline',
};
const toggleGroupCompoundVariants = [];

const toggleGroupSlotNames = [
  ['root', 'toggleGroup__root'],
  ['item', 'toggleGroup__item'],
];
const toggleGroupSlotFns = /* @__PURE__ */ toggleGroupSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      toggleGroupDefaultVariants,
      getSlotCompoundVariant(toggleGroupCompoundVariants, slotName),
    ),
  ],
);

const toggleGroupFn = memo((props = {}) => {
  return Object.fromEntries(
    toggleGroupSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const toggleGroupVariantKeys = ['variant', 'size'];
const getVariantProps = (variants) => ({
  ...toggleGroupDefaultVariants,
  ...compact(variants),
});

export const toggleGroup = /* @__PURE__ */ Object.assign(toggleGroupFn, {
  __recipe__: false,
  __name__: 'toggleGroup',
  raw: (props) => props,
  variantKeys: toggleGroupVariantKeys,
  variantMap: {
    variant: ['outline', 'ghost'],
    size: ['sm', 'md', 'lg'],
  },
  splitVariantProps(props) {
    return splitProps(props, toggleGroupVariantKeys);
  },
  getVariantProps,
});
