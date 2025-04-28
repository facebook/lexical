import {memo, splitProps} from '../helpers.mjs';
import {createRecipe, mergeRecipes} from './create-recipe.mjs';

const textFn = /* @__PURE__ */ createRecipe('text', {}, []);

const textVariantMap = {
  variant: ['heading'],
  size: [
    'xs',
    'sm',
    'md',
    'lg',
    'xl',
    '2xl',
    '3xl',
    '4xl',
    '5xl',
    '6xl',
    '7xl',
  ],
};

const textVariantKeys = Object.keys(textVariantMap);

export const text = /* @__PURE__ */ Object.assign(memo(textFn.recipeFn), {
  __recipe__: true,
  __name__: 'text',
  __getCompoundVariantCss__: textFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: textVariantKeys,
  variantMap: textVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe);
  },
  splitVariantProps(props) {
    return splitProps(props, textVariantKeys);
  },
  getVariantProps: textFn.getVariantProps,
});
