import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const switchRecipeDefaultVariants = {
  size: 'md',
};
const switchRecipeCompoundVariants = [];

const switchRecipeSlotNames = [
  ['root', 'switchRecipe__root'],
  ['label', 'switchRecipe__label'],
  ['control', 'switchRecipe__control'],
  ['thumb', 'switchRecipe__thumb'],
];
const switchRecipeSlotFns = /* @__PURE__ */ switchRecipeSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      switchRecipeDefaultVariants,
      getSlotCompoundVariant(switchRecipeCompoundVariants, slotName),
    ),
  ],
);

const switchRecipeFn = memo((props = {}) => {
  return Object.fromEntries(
    switchRecipeSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const switchRecipeVariantKeys = ['size'];
const getVariantProps = (variants) => ({
  ...switchRecipeDefaultVariants,
  ...compact(variants),
});

export const switchRecipe = /* @__PURE__ */ Object.assign(switchRecipeFn, {
  __recipe__: false,
  __name__: 'switchRecipe',
  raw: (props) => props,
  variantKeys: switchRecipeVariantKeys,
  variantMap: {
    size: ['sm', 'md', 'lg'],
  },
  splitVariantProps(props) {
    return splitProps(props, switchRecipeVariantKeys);
  },
  getVariantProps,
});
