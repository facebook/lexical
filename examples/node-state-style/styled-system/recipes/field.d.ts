/* eslint-disable */
import type {ConditionalValue} from '../types/index';
import type {DistributiveOmit, Pretty} from '../types/system-types';

interface FieldVariant {}

type FieldVariantMap = {
  [key in keyof FieldVariant]: Array<FieldVariant[key]>;
};

export type FieldVariantProps = {
  [key in keyof FieldVariant]?: ConditionalValue<FieldVariant[key]> | undefined;
};

export interface FieldRecipe {
  __type: FieldVariantProps;
  (props?: FieldVariantProps): Pretty<
    Record<
      | 'root'
      | 'errorText'
      | 'helperText'
      | 'input'
      | 'label'
      | 'select'
      | 'textarea',
      string
    >
  >;
  raw: (props?: FieldVariantProps) => FieldVariantProps;
  variantMap: FieldVariantMap;
  variantKeys: Array<keyof FieldVariant>;
  splitVariantProps<Props extends FieldVariantProps>(
    props: Props,
  ): [
    FieldVariantProps,
    Pretty<DistributiveOmit<Props, keyof FieldVariantProps>>,
  ];
  getVariantProps: (props?: FieldVariantProps) => FieldVariantProps;
}

export declare const field: FieldRecipe;
