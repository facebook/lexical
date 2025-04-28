/* eslint-disable */
import type {ConditionalValue} from '../types/index';
import type {DistributiveOmit, Pretty} from '../types/system-types';

interface TooltipVariant {}

type TooltipVariantMap = {
  [key in keyof TooltipVariant]: Array<TooltipVariant[key]>;
};

export type TooltipVariantProps = {
  [key in keyof TooltipVariant]?:
    | ConditionalValue<TooltipVariant[key]>
    | undefined;
};

export interface TooltipRecipe {
  __type: TooltipVariantProps;
  (props?: TooltipVariantProps): Pretty<
    Record<'trigger' | 'arrow' | 'arrowTip' | 'positioner' | 'content', string>
  >;
  raw: (props?: TooltipVariantProps) => TooltipVariantProps;
  variantMap: TooltipVariantMap;
  variantKeys: Array<keyof TooltipVariant>;
  splitVariantProps<Props extends TooltipVariantProps>(
    props: Props,
  ): [
    TooltipVariantProps,
    Pretty<DistributiveOmit<Props, keyof TooltipVariantProps>>,
  ];
  getVariantProps: (props?: TooltipVariantProps) => TooltipVariantProps;
}

export declare const tooltip: TooltipRecipe;
