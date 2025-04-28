/* eslint-disable */
import type {ConditionalValue} from '../types/index';
import type {DistributiveOmit, Pretty} from '../types/system-types';

interface ToggleGroupVariant {
  /**
   * @default "outline"
   */
  variant: 'outline' | 'ghost';
  /**
   * @default "md"
   */
  size: 'sm' | 'md' | 'lg';
}

type ToggleGroupVariantMap = {
  [key in keyof ToggleGroupVariant]: Array<ToggleGroupVariant[key]>;
};

export type ToggleGroupVariantProps = {
  [key in keyof ToggleGroupVariant]?:
    | ConditionalValue<ToggleGroupVariant[key]>
    | undefined;
};

export interface ToggleGroupRecipe {
  __type: ToggleGroupVariantProps;
  (props?: ToggleGroupVariantProps): Pretty<Record<'root' | 'item', string>>;
  raw: (props?: ToggleGroupVariantProps) => ToggleGroupVariantProps;
  variantMap: ToggleGroupVariantMap;
  variantKeys: Array<keyof ToggleGroupVariant>;
  splitVariantProps<Props extends ToggleGroupVariantProps>(
    props: Props,
  ): [
    ToggleGroupVariantProps,
    Pretty<DistributiveOmit<Props, keyof ToggleGroupVariantProps>>,
  ];
  getVariantProps: (props?: ToggleGroupVariantProps) => ToggleGroupVariantProps;
}

export declare const toggleGroup: ToggleGroupRecipe;
