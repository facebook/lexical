import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const segmentGroupDefaultVariants = {
  size: 'md',
};
const segmentGroupCompoundVariants = [];

const segmentGroupSlotNames = [
  ['root', 'segmentGroup__root'],
  ['label', 'segmentGroup__label'],
  ['item', 'segmentGroup__item'],
  ['itemText', 'segmentGroup__itemText'],
  ['itemControl', 'segmentGroup__itemControl'],
  ['indicator', 'segmentGroup__indicator'],
];
const segmentGroupSlotFns = /* @__PURE__ */ segmentGroupSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      segmentGroupDefaultVariants,
      getSlotCompoundVariant(segmentGroupCompoundVariants, slotName),
    ),
  ],
);

const segmentGroupFn = memo((props = {}) => {
  return Object.fromEntries(
    segmentGroupSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const segmentGroupVariantKeys = ['size'];
const getVariantProps = (variants) => ({
  ...segmentGroupDefaultVariants,
  ...compact(variants),
});

export const segmentGroup = /* @__PURE__ */ Object.assign(segmentGroupFn, {
  __recipe__: false,
  __name__: 'segmentGroup',
  raw: (props) => props,
  variantKeys: segmentGroupVariantKeys,
  variantMap: {
    size: ['sm', 'md'],
  },
  splitVariantProps(props) {
    return splitProps(props, segmentGroupVariantKeys);
  },
  getVariantProps,
});
