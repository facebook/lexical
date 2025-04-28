/* eslint-disable */
import type {ConditionalValue} from '../types/index';
import type {DistributiveOmit, Pretty} from '../types/system-types';

interface SliderVariant {
  /**
   * @default "md"
   */
  size: 'sm' | 'md' | 'lg';
}

type SliderVariantMap = {
  [key in keyof SliderVariant]: Array<SliderVariant[key]>;
};

export type SliderVariantProps = {
  [key in keyof SliderVariant]?:
    | ConditionalValue<SliderVariant[key]>
    | undefined;
};

export interface SliderRecipe {
  __type: SliderVariantProps;
  (props?: SliderVariantProps): Pretty<
    Record<
      | 'root'
      | 'label'
      | 'thumb'
      | 'valueText'
      | 'track'
      | 'range'
      | 'control'
      | 'markerGroup'
      | 'marker',
      string
    >
  >;
  raw: (props?: SliderVariantProps) => SliderVariantProps;
  variantMap: SliderVariantMap;
  variantKeys: Array<keyof SliderVariant>;
  splitVariantProps<Props extends SliderVariantProps>(
    props: Props,
  ): [
    SliderVariantProps,
    Pretty<DistributiveOmit<Props, keyof SliderVariantProps>>,
  ];
  getVariantProps: (props?: SliderVariantProps) => SliderVariantProps;
}

export declare const slider: SliderRecipe;
