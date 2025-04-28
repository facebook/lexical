import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const signaturePadDefaultVariants = {};
const signaturePadCompoundVariants = [];

const signaturePadSlotNames = [
  ['root', 'signaturePad__root'],
  ['control', 'signaturePad__control'],
  ['segment', 'signaturePad__segment'],
  ['segmentPath', 'signaturePad__segmentPath'],
  ['guide', 'signaturePad__guide'],
  ['clearTrigger', 'signaturePad__clearTrigger'],
  ['label', 'signaturePad__label'],
];
const signaturePadSlotFns = /* @__PURE__ */ signaturePadSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      signaturePadDefaultVariants,
      getSlotCompoundVariant(signaturePadCompoundVariants, slotName),
    ),
  ],
);

const signaturePadFn = memo((props = {}) => {
  return Object.fromEntries(
    signaturePadSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const signaturePadVariantKeys = [];
const getVariantProps = (variants) => ({
  ...signaturePadDefaultVariants,
  ...compact(variants),
});

export const signaturePad = /* @__PURE__ */ Object.assign(signaturePadFn, {
  __recipe__: false,
  __name__: 'signaturePad',
  raw: (props) => props,
  variantKeys: signaturePadVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, signaturePadVariantKeys);
  },
  getVariantProps,
});
