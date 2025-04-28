import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const numberInputDefaultVariants = {
  size: 'md',
};
const numberInputCompoundVariants = [];

const numberInputSlotNames = [
  ['root', 'numberInput__root'],
  ['label', 'numberInput__label'],
  ['input', 'numberInput__input'],
  ['control', 'numberInput__control'],
  ['valueText', 'numberInput__valueText'],
  ['incrementTrigger', 'numberInput__incrementTrigger'],
  ['decrementTrigger', 'numberInput__decrementTrigger'],
  ['scrubber', 'numberInput__scrubber'],
];
const numberInputSlotFns = /* @__PURE__ */ numberInputSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      numberInputDefaultVariants,
      getSlotCompoundVariant(numberInputCompoundVariants, slotName),
    ),
  ],
);

const numberInputFn = memo((props = {}) => {
  return Object.fromEntries(
    numberInputSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const numberInputVariantKeys = ['size'];
const getVariantProps = (variants) => ({
  ...numberInputDefaultVariants,
  ...compact(variants),
});

export const numberInput = /* @__PURE__ */ Object.assign(numberInputFn, {
  __recipe__: false,
  __name__: 'numberInput',
  raw: (props) => props,
  variantKeys: numberInputVariantKeys,
  variantMap: {
    size: ['md', 'lg', 'xl'],
  },
  splitVariantProps(props) {
    return splitProps(props, numberInputVariantKeys);
  },
  getVariantProps,
});
