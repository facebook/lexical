import {
  compact,
  getSlotCompoundVariant,
  memo,
  splitProps,
} from '../helpers.mjs';
import {createRecipe} from './create-recipe.mjs';

const tabsDefaultVariants = {
  size: 'md',
  variant: 'line',
};
const tabsCompoundVariants = [
  {
    size: 'sm',
    variant: 'enclosed',
    css: {
      list: {
        height: '10',
      },
      trigger: {
        h: '8',
        minW: '8',
        textStyle: 'sm',
        px: '3',
      },
      content: {
        p: '3.5',
      },
    },
  },
  {
    size: 'md',
    variant: 'enclosed',
    css: {
      list: {
        height: '11',
      },
      trigger: {
        h: '9',
        minW: '9',
        textStyle: 'sm',
        px: '3.5',
      },
      content: {
        p: '4',
      },
    },
  },
  {
    size: 'lg',
    variant: 'enclosed',
    css: {
      list: {
        height: '12',
      },
      trigger: {
        h: '10',
        minW: '10',
        textStyle: 'sm',
        px: '4',
      },
      content: {
        p: '4.5',
      },
    },
  },
  {
    size: 'sm',
    variant: 'outline',
    css: {
      trigger: {
        h: '9',
        minW: '9',
        textStyle: 'sm',
        px: '3.5',
      },
      content: {
        p: '3.5',
      },
    },
  },
  {
    size: 'md',
    variant: 'outline',
    css: {
      trigger: {
        h: '10',
        minW: '10',
        textStyle: 'sm',
        px: '4',
      },
      content: {
        p: '4',
      },
    },
  },
  {
    size: 'lg',
    variant: 'outline',
    css: {
      trigger: {
        h: '11',
        minW: '11',
        textStyle: 'md',
        px: '4.5',
      },
      content: {
        p: '4.5',
      },
    },
  },
  {
    size: 'sm',
    variant: 'line',
    css: {
      trigger: {
        fontSize: 'sm',
        h: '9',
        minW: '9',
        px: '2.5',
      },
      content: {
        pt: '3',
      },
    },
  },
  {
    size: 'md',
    variant: 'line',
    css: {
      trigger: {
        fontSize: 'md',
        h: '10',
        minW: '10',
        px: '3',
      },
      content: {
        pt: '4',
      },
    },
  },
  {
    size: 'lg',
    variant: 'line',
    css: {
      trigger: {
        px: '3.5',
        h: '11',
        minW: '11',
        fontSize: 'md',
      },
      content: {
        pt: '5',
      },
    },
  },
];

const tabsSlotNames = [
  ['root', 'tabs__root'],
  ['list', 'tabs__list'],
  ['trigger', 'tabs__trigger'],
  ['content', 'tabs__content'],
  ['indicator', 'tabs__indicator'],
];
const tabsSlotFns = /* @__PURE__ */ tabsSlotNames.map(([slotName, slotKey]) => [
  slotName,
  createRecipe(
    slotKey,
    tabsDefaultVariants,
    getSlotCompoundVariant(tabsCompoundVariants, slotName),
  ),
]);

const tabsFn = memo((props = {}) => {
  return Object.fromEntries(
    tabsSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]),
  );
});

const tabsVariantKeys = ['variant', 'size'];
const getVariantProps = (variants) => ({
  ...tabsDefaultVariants,
  ...compact(variants),
});

export const tabs = /* @__PURE__ */ Object.assign(tabsFn, {
  __recipe__: false,
  __name__: 'tabs',
  raw: (props) => props,
  variantKeys: tabsVariantKeys,
  variantMap: {
    variant: ['enclosed', 'line', 'outline'],
    size: ['sm', 'md', 'lg'],
  },
  splitVariantProps(props) {
    return splitProps(props, tabsVariantKeys);
  },
  getVariantProps,
});
