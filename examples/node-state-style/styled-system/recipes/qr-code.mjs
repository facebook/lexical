import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const qrCodeDefaultVariants = {};
const qrCodeCompoundVariants = [];

const qrCodeSlotNames = [
  ['root', 'qrCode__root'],
  ['frame', 'qrCode__frame'],
  ['pattern', 'qrCode__pattern'],
  ['overlay', 'qrCode__overlay'],
];
const qrCodeSlotFns = /* @__PURE__ */ qrCodeSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      qrCodeDefaultVariants,
      getSlotCompoundVariant(qrCodeCompoundVariants, slotName),
    ),
  ],
);

const qrCodeFn = memo((props = {}) => {
  return Object.fromEntries(
    qrCodeSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const qrCodeVariantKeys = [];
const getVariantProps = (variants) => ({
  ...qrCodeDefaultVariants,
  ...compact(variants),
});

export const qrCode = /* @__PURE__ */ Object.assign(qrCodeFn, {
  __recipe__: false,
  __name__: 'qrCode',
  raw: (props) => props,
  variantKeys: qrCodeVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, qrCodeVariantKeys);
  },
  getVariantProps,
});
