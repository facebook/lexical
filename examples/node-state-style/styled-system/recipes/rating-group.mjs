import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const ratingGroupDefaultVariants = {
  size: 'md',
};
const ratingGroupCompoundVariants = [];

const ratingGroupSlotNames = [
  ['root', 'ratingGroup__root'],
  ['label', 'ratingGroup__label'],
  ['item', 'ratingGroup__item'],
  ['control', 'ratingGroup__control'],
];
const ratingGroupSlotFns = /* @__PURE__ */ ratingGroupSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      ratingGroupDefaultVariants,
      getSlotCompoundVariant(ratingGroupCompoundVariants, slotName),
    ),
  ],
);

const ratingGroupFn = memo((props = {}) => {
  return Object.fromEntries(
    ratingGroupSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const ratingGroupVariantKeys = ['size'];
const getVariantProps = (variants) => ({
  ...ratingGroupDefaultVariants,
  ...compact(variants),
});

export const ratingGroup = /* @__PURE__ */ Object.assign(ratingGroupFn, {
  __recipe__: false,
  __name__: 'ratingGroup',
  raw: (props) => props,
  variantKeys: ratingGroupVariantKeys,
  variantMap: {
    size: ['sm', 'md', 'lg'],
  },
  splitVariantProps(props) {
    return splitProps(props, ratingGroupVariantKeys);
  },
  getVariantProps,
});
