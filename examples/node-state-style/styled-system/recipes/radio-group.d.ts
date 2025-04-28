/* eslint-disable */
import type {ConditionalValue} from '../types/index';
import type {DistributiveOmit, Pretty} from '../types/system-types';

interface RadioGroupVariant {
  /**
   * @default "md"
   */
  size: 'sm' | 'md' | 'lg';
}

type RadioGroupVariantMap = {
  [key in keyof RadioGroupVariant]: Array<RadioGroupVariant[key]>;
};

export type RadioGroupVariantProps = {
  [key in keyof RadioGroupVariant]?:
    | ConditionalValue<RadioGroupVariant[key]>
    | undefined;
};

export interface RadioGroupRecipe {
  __type: RadioGroupVariantProps;
  (props?: RadioGroupVariantProps): Pretty<
    Record<
      'root' | 'label' | 'item' | 'itemText' | 'itemControl' | 'indicator',
      string
    >
  >;
  raw: (props?: RadioGroupVariantProps) => RadioGroupVariantProps;
  variantMap: RadioGroupVariantMap;
  variantKeys: Array<keyof RadioGroupVariant>;
  splitVariantProps<Props extends RadioGroupVariantProps>(
    props: Props,
  ): [
    RadioGroupVariantProps,
    Pretty<DistributiveOmit<Props, keyof RadioGroupVariantProps>>,
  ];
  getVariantProps: (props?: RadioGroupVariantProps) => RadioGroupVariantProps;
}

export declare const radioGroup: RadioGroupRecipe;
