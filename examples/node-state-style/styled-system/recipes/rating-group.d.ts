/* eslint-disable */
import type {ConditionalValue} from '../types/index';
import type {DistributiveOmit, Pretty} from '../types/system-types';

interface RatingGroupVariant {
  /**
   * @default "md"
   */
  size: 'sm' | 'md' | 'lg';
}

type RatingGroupVariantMap = {
  [key in keyof RatingGroupVariant]: Array<RatingGroupVariant[key]>;
};

export type RatingGroupVariantProps = {
  [key in keyof RatingGroupVariant]?:
    | ConditionalValue<RatingGroupVariant[key]>
    | undefined;
};

export interface RatingGroupRecipe {
  __type: RatingGroupVariantProps;
  (props?: RatingGroupVariantProps): Pretty<
    Record<'root' | 'label' | 'item' | 'control', string>
  >;
  raw: (props?: RatingGroupVariantProps) => RatingGroupVariantProps;
  variantMap: RatingGroupVariantMap;
  variantKeys: Array<keyof RatingGroupVariant>;
  splitVariantProps<Props extends RatingGroupVariantProps>(
    props: Props,
  ): [
    RatingGroupVariantProps,
    Pretty<DistributiveOmit<Props, keyof RatingGroupVariantProps>>,
  ];
  getVariantProps: (props?: RatingGroupVariantProps) => RatingGroupVariantProps;
}

export declare const ratingGroup: RatingGroupRecipe;
