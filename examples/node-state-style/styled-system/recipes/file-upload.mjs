import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const fileUploadDefaultVariants = {};
const fileUploadCompoundVariants = [];

const fileUploadSlotNames = [
  ['root', 'fileUpload__root'],
  ['dropzone', 'fileUpload__dropzone'],
  ['item', 'fileUpload__item'],
  ['itemDeleteTrigger', 'fileUpload__itemDeleteTrigger'],
  ['itemGroup', 'fileUpload__itemGroup'],
  ['itemName', 'fileUpload__itemName'],
  ['itemPreview', 'fileUpload__itemPreview'],
  ['itemPreviewImage', 'fileUpload__itemPreviewImage'],
  ['itemSizeText', 'fileUpload__itemSizeText'],
  ['label', 'fileUpload__label'],
  ['trigger', 'fileUpload__trigger'],
];
const fileUploadSlotFns = /* @__PURE__ */ fileUploadSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      fileUploadDefaultVariants,
      getSlotCompoundVariant(fileUploadCompoundVariants, slotName),
    ),
  ],
);

const fileUploadFn = memo((props = {}) => {
  return Object.fromEntries(
    fileUploadSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const fileUploadVariantKeys = [];
const getVariantProps = (variants) => ({
  ...fileUploadDefaultVariants,
  ...compact(variants),
});

export const fileUpload = /* @__PURE__ */ Object.assign(fileUploadFn, {
  __recipe__: false,
  __name__: 'fileUpload',
  raw: (props) => props,
  variantKeys: fileUploadVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, fileUploadVariantKeys);
  },
  getVariantProps,
});
