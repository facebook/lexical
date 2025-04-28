/* eslint-disable */
import type {ConditionalValue} from '../types/index';
import type {DistributiveOmit, Pretty} from '../types/system-types';

interface RadioButtonGroupVariant {
  /**
   * @default "solid"
   */
  variant: 'solid' | 'outline';
  /**
   * @default "md"
   */
  size: 'sm' | 'md' | 'lg' | 'xl';
}

type RadioButtonGroupVariantMap = {
  [key in keyof RadioButtonGroupVariant]: Array<RadioButtonGroupVariant[key]>;
};

export type RadioButtonGroupVariantProps = {
  [key in keyof RadioButtonGroupVariant]?:
    | ConditionalValue<RadioButtonGroupVariant[key]>
    | undefined;
};

export interface RadioButtonGroupRecipe {
  __type: RadioButtonGroupVariantProps;
  (props?: RadioButtonGroupVariantProps): Pretty<
    Record<
      'root' | 'label' | 'item' | 'itemText' | 'itemControl' | 'indicator',
      string
    >
  >;
  raw: (props?: RadioButtonGroupVariantProps) => RadioButtonGroupVariantProps;
  variantMap: RadioButtonGroupVariantMap;
  variantKeys: Array<keyof RadioButtonGroupVariant>;
  splitVariantProps<Props extends RadioButtonGroupVariantProps>(
    props: Props,
  ): [
    RadioButtonGroupVariantProps,
    Pretty<DistributiveOmit<Props, keyof RadioButtonGroupVariantProps>>,
  ];
  getVariantProps: (
    props?: RadioButtonGroupVariantProps,
  ) => RadioButtonGroupVariantProps;
}

export declare const radioButtonGroup: RadioButtonGroupRecipe;
