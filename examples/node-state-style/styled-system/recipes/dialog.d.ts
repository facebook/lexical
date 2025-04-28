/* eslint-disable */
import type {ConditionalValue} from '../types/index';
import type {DistributiveOmit, Pretty} from '../types/system-types';

interface DialogVariant {}

type DialogVariantMap = {
  [key in keyof DialogVariant]: Array<DialogVariant[key]>;
};

export type DialogVariantProps = {
  [key in keyof DialogVariant]?:
    | ConditionalValue<DialogVariant[key]>
    | undefined;
};

export interface DialogRecipe {
  __type: DialogVariantProps;
  (props?: DialogVariantProps): Pretty<
    Record<
      | 'trigger'
      | 'backdrop'
      | 'positioner'
      | 'content'
      | 'title'
      | 'description'
      | 'closeTrigger',
      string
    >
  >;
  raw: (props?: DialogVariantProps) => DialogVariantProps;
  variantMap: DialogVariantMap;
  variantKeys: Array<keyof DialogVariant>;
  splitVariantProps<Props extends DialogVariantProps>(
    props: Props,
  ): [
    DialogVariantProps,
    Pretty<DistributiveOmit<Props, keyof DialogVariantProps>>,
  ];
  getVariantProps: (props?: DialogVariantProps) => DialogVariantProps;
}

export declare const dialog: DialogRecipe;
