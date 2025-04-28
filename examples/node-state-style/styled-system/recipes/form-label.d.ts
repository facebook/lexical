/* eslint-disable */
import type {ConditionalValue} from '../types/index';
import type {DistributiveOmit, Pretty} from '../types/system-types';

interface FormLabelVariant {
  /**
   * @default "md"
   */
  size: 'sm' | 'md' | 'lg' | 'xl';
}

type FormLabelVariantMap = {
  [key in keyof FormLabelVariant]: Array<FormLabelVariant[key]>;
};

export type FormLabelVariantProps = {
  [key in keyof FormLabelVariant]?:
    | ConditionalValue<FormLabelVariant[key]>
    | undefined;
};

export interface FormLabelRecipe {
  __type: FormLabelVariantProps;
  (props?: FormLabelVariantProps): string;
  raw: (props?: FormLabelVariantProps) => FormLabelVariantProps;
  variantMap: FormLabelVariantMap;
  variantKeys: Array<keyof FormLabelVariant>;
  splitVariantProps<Props extends FormLabelVariantProps>(
    props: Props,
  ): [
    FormLabelVariantProps,
    Pretty<DistributiveOmit<Props, keyof FormLabelVariantProps>>,
  ];
  getVariantProps: (props?: FormLabelVariantProps) => FormLabelVariantProps;
}

export declare const formLabel: FormLabelRecipe;
