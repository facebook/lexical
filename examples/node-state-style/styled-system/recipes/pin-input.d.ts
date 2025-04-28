/* eslint-disable */
import type {ConditionalValue} from '../types/index';
import type {DistributiveOmit, Pretty} from '../types/system-types';

interface PinInputVariant {
  /**
   * @default "md"
   */
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

type PinInputVariantMap = {
  [key in keyof PinInputVariant]: Array<PinInputVariant[key]>;
};

export type PinInputVariantProps = {
  [key in keyof PinInputVariant]?:
    | ConditionalValue<PinInputVariant[key]>
    | undefined;
};

export interface PinInputRecipe {
  __type: PinInputVariantProps;
  (props?: PinInputVariantProps): Pretty<
    Record<'root' | 'label' | 'input' | 'control', string>
  >;
  raw: (props?: PinInputVariantProps) => PinInputVariantProps;
  variantMap: PinInputVariantMap;
  variantKeys: Array<keyof PinInputVariant>;
  splitVariantProps<Props extends PinInputVariantProps>(
    props: Props,
  ): [
    PinInputVariantProps,
    Pretty<DistributiveOmit<Props, keyof PinInputVariantProps>>,
  ];
  getVariantProps: (props?: PinInputVariantProps) => PinInputVariantProps;
}

export declare const pinInput: PinInputRecipe;
