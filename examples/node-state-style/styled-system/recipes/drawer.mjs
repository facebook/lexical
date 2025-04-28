import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const drawerDefaultVariants = {
  variant: 'right',
};
const drawerCompoundVariants = [];

const drawerSlotNames = [
  ['trigger', 'drawer__trigger'],
  ['backdrop', 'drawer__backdrop'],
  ['positioner', 'drawer__positioner'],
  ['content', 'drawer__content'],
  ['title', 'drawer__title'],
  ['description', 'drawer__description'],
  ['closeTrigger', 'drawer__closeTrigger'],
  ['header', 'drawer__header'],
  ['body', 'drawer__body'],
  ['footer', 'drawer__footer'],
];
const drawerSlotFns = /* @__PURE__ */ drawerSlotNames.map(
  ([slotName, slotKey]) => [
    slotName,
    createRecipe(
      slotKey,
      drawerDefaultVariants,
      getSlotCompoundVariant(drawerCompoundVariants, slotName),
    ),
  ],
);

const drawerFn = memo((props = {}) => {
  return Object.fromEntries(
    drawerSlotFns.map(([slotName, slotFn]) => [
      slotName,
      slotFn.recipeFn(props),
    ]),
  );
});

const drawerVariantKeys = ['variant'];
const getVariantProps = (variants) => ({
  ...drawerDefaultVariants,
  ...compact(variants),
});

export const drawer = /* @__PURE__ */ Object.assign(drawerFn, {
  __recipe__: false,
  __name__: 'drawer',
  raw: (props) => props,
  variantKeys: drawerVariantKeys,
  variantMap: {
    variant: ['left', 'right'],
  },
  splitVariantProps(props) {
    return splitProps(props, drawerVariantKeys);
  },
  getVariantProps,
});
