import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const popoverDefaultVariants = {};
const popoverCompoundVariants = [];

const popoverSlotNames = [
  ['arrow', 'popover__arrow'],
  ['arrowTip', 'popover__arrowTip'],
  ['anchor', 'popover__anchor'],
  ['trigger', 'popover__trigger'],
  ['indicator', 'popover__indicator'],
  ['positioner', 'popover__positioner'],
  ['content', 'popover__content'],
  ['title', 'popover__title'],
  ['description', 'popover__description'],
  ['closeTrigger', 'popover__closeTrigger'],
];
const popoverSlotFns = /* @__PURE__ */ popoverSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      popoverDefaultVariants,
      getSlotCompoundVariant(popoverCompoundVariants, slotName),
    ),
  ],
);

const popoverFn = memo((props = {}) => {
  return Object.fromEntries(
    popoverSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const popoverVariantKeys = [];
const getVariantProps = (variants) => ({
  ...popoverDefaultVariants,
  ...compact(variants),
});

export const popover = /* @__PURE__ */ Object.assign(popoverFn, {
  __recipe__: false,
  __name__: 'popover',
  raw: (props) => props,
  variantKeys: popoverVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, popoverVariantKeys);
  },
  getVariantProps,
});
