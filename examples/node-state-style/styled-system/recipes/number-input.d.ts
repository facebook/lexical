/* eslint-disable */
import type {ConditionalValue} from '../types/index';
import type {DistributiveOmit, Pretty} from '../types/system-types';

interface NumberInputVariant {
  /**
   * @default "md"
   */
  size: 'md' | 'lg' | 'xl';
}

type NumberInputVariantMap = {
  [key in keyof NumberInputVariant]: Array<NumberInputVariant[key]>;
};

export type NumberInputVariantProps = {
  [key in keyof NumberInputVariant]?:
    | ConditionalValue<NumberInputVariant[key]>
    | undefined;
};

export interface NumberInputRecipe {
  __type: NumberInputVariantProps;
  (props?: NumberInputVariantProps): Pretty<
    Record<
      | 'root'
      | 'label'
      | 'input'
      | 'control'
      | 'valueText'
      | 'incrementTrigger'
      | 'decrementTrigger'
      | 'scrubber',
      string
    >
  >;
  raw: (props?: NumberInputVariantProps) => NumberInputVariantProps;
  variantMap: NumberInputVariantMap;
  variantKeys: Array<keyof NumberInputVariant>;
  splitVariantProps<Props extends NumberInputVariantProps>(
    props: Props,
  ): [
    NumberInputVariantProps,
    Pretty<DistributiveOmit<Props, keyof NumberInputVariantProps>>,
  ];
  getVariantProps: (props?: NumberInputVariantProps) => NumberInputVariantProps;
}

export declare const numberInput: NumberInputRecipe;
