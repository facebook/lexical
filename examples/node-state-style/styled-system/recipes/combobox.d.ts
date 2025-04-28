/* eslint-disable */
import type {ConditionalValue} from '../types/index';
import type {DistributiveOmit, Pretty} from '../types/system-types';

interface ComboboxVariant {
  /**
   * @default "md"
   */
  size: 'sm' | 'md' | 'lg';
}

type ComboboxVariantMap = {
  [key in keyof ComboboxVariant]: Array<ComboboxVariant[key]>;
};

export type ComboboxVariantProps = {
  [key in keyof ComboboxVariant]?:
    | ConditionalValue<ComboboxVariant[key]>
    | undefined;
};

export interface ComboboxRecipe {
  __type: ComboboxVariantProps;
  (props?: ComboboxVariantProps): Pretty<
    Record<
      | 'root'
      | 'clearTrigger'
      | 'content'
      | 'control'
      | 'input'
      | 'item'
      | 'itemGroup'
      | 'itemGroupLabel'
      | 'itemIndicator'
      | 'itemText'
      | 'label'
      | 'list'
      | 'positioner'
      | 'trigger',
      string
    >
  >;
  raw: (props?: ComboboxVariantProps) => ComboboxVariantProps;
  variantMap: ComboboxVariantMap;
  variantKeys: Array<keyof ComboboxVariant>;
  splitVariantProps<Props extends ComboboxVariantProps>(
    props: Props,
  ): [
    ComboboxVariantProps,
    Pretty<DistributiveOmit<Props, keyof ComboboxVariantProps>>,
  ];
  getVariantProps: (props?: ComboboxVariantProps) => ComboboxVariantProps;
}

export declare const combobox: ComboboxRecipe;
