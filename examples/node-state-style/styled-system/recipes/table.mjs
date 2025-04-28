import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const tableDefaultVariants = {
  size: 'md',
  variant: 'plain',
};
const tableCompoundVariants = [];

const tableSlotNames = [
  ['root', 'table__root'],
  ['body', 'table__body'],
  ['cell', 'table__cell'],
  ['footer', 'table__footer'],
  ['head', 'table__head'],
  ['header', 'table__header'],
  ['row', 'table__row'],
  ['caption', 'table__caption'],
];
const tableSlotFns = /* @__PURE__ */ tableSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      tableDefaultVariants,
      getSlotCompoundVariant(tableCompoundVariants, slotName),
    ),
  ],
);

const tableFn = memo((props = {}) => {
  return Object.fromEntries(
    tableSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const tableVariantKeys = ['variant', 'size'];
const getVariantProps = (variants) => ({
  ...tableDefaultVariants,
  ...compact(variants),
});

export const table = /* @__PURE__ */ Object.assign(tableFn, {
  __recipe__: false,
  __name__: 'table',
  raw: (props) => props,
  variantKeys: tableVariantKeys,
  variantMap: {
    variant: ['outline', 'plain'],
    size: ['sm', 'md'],
  },
  splitVariantProps(props) {
    return splitProps(props, tableVariantKeys);
  },
  getVariantProps,
});
