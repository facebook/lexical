import {memo, splitProps} from '../helpers.mjs';
import {createRecipe, mergeRecipes} from './create-recipe.mjs';

const formLabelFn = /* @__PURE__ */ createRecipe(
  'formLabel',
  {
    size: 'md',
  },
  [],
);

const formLabelVariantMap = {
  size: ['sm', 'md', 'lg', 'xl'],
};

const formLabelVariantKeys = Object.keys(formLabelVariantMap);

export const formLabel = /* @__PURE__ */ Object.assign(
  memo(formLabelFn.recipeFn),
  {
    __recipe__: true,
    __name__: 'formLabel',
    __getCompoundVariantCss__: formLabelFn.__getCompoundVariantCss__,
    raw: (props) => props,
    variantKeys: formLabelVariantKeys,
    variantMap: formLabelVariantMap,
    merge(recipe) {
      return mergeRecipes(this, recipe);
    },
    splitVariantProps(props) {
      return splitProps(props, formLabelVariantKeys);
    },
    getVariantProps: formLabelFn.getVariantProps,
  },
);
