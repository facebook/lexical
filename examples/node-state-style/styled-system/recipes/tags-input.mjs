import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const tagsInputDefaultVariants = {
  size: 'md',
};
const tagsInputCompoundVariants = [];

const tagsInputSlotNames = [
  ['root', 'tagsInput__root'],
  ['label', 'tagsInput__label'],
  ['control', 'tagsInput__control'],
  ['input', 'tagsInput__input'],
  ['clearTrigger', 'tagsInput__clearTrigger'],
  ['item', 'tagsInput__item'],
  ['itemPreview', 'tagsInput__itemPreview'],
  ['itemInput', 'tagsInput__itemInput'],
  ['itemText', 'tagsInput__itemText'],
  ['itemDeleteTrigger', 'tagsInput__itemDeleteTrigger'],
];
const tagsInputSlotFns = /* @__PURE__ */ tagsInputSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      tagsInputDefaultVariants,
      getSlotCompoundVariant(tagsInputCompoundVariants, slotName),
    ),
  ],
);

const tagsInputFn = memo((props = {}) => {
  return Object.fromEntries(
    tagsInputSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const tagsInputVariantKeys = ['size'];
const getVariantProps = (variants) => ({
  ...tagsInputDefaultVariants,
  ...compact(variants),
});

export const tagsInput = /* @__PURE__ */ Object.assign(tagsInputFn, {
  __recipe__: false,
  __name__: 'tagsInput',
  raw: (props) => props,
  variantKeys: tagsInputVariantKeys,
  variantMap: {
    size: ['md'],
  },
  splitVariantProps(props) {
    return splitProps(props, tagsInputVariantKeys);
  },
  getVariantProps,
});
