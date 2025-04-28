import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const sliderDefaultVariants = {
  size: 'md',
};
const sliderCompoundVariants = [];

const sliderSlotNames = [
  ['root', 'slider__root'],
  ['label', 'slider__label'],
  ['thumb', 'slider__thumb'],
  ['valueText', 'slider__valueText'],
  ['track', 'slider__track'],
  ['range', 'slider__range'],
  ['control', 'slider__control'],
  ['markerGroup', 'slider__markerGroup'],
  ['marker', 'slider__marker'],
];
const sliderSlotFns = /* @__PURE__ */ sliderSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      sliderDefaultVariants,
      getSlotCompoundVariant(sliderCompoundVariants, slotName),
    ),
  ],
);

const sliderFn = memo((props = {}) => {
  return Object.fromEntries(
    sliderSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const sliderVariantKeys = ['size'];
const getVariantProps = (variants) => ({
  ...sliderDefaultVariants,
  ...compact(variants),
});

export const slider = /* @__PURE__ */ Object.assign(sliderFn, {
  __recipe__: false,
  __name__: 'slider',
  raw: (props) => props,
  variantKeys: sliderVariantKeys,
  variantMap: {
    size: ['sm', 'md', 'lg'],
  },
  splitVariantProps(props) {
    return splitProps(props, sliderVariantKeys);
  },
  getVariantProps,
});
