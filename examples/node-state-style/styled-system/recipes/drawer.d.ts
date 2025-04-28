/* eslint-disable */
import type {ConditionalValue} from '../types/index';
import type {DistributiveOmit, Pretty} from '../types/system-types';

interface DrawerVariant {
  /**
   * @default "right"
   */
  variant: 'left' | 'right';
}

type DrawerVariantMap = {
  [key in keyof DrawerVariant]: Array<DrawerVariant[key]>;
};

export type DrawerVariantProps = {
  [key in keyof DrawerVariant]?:
    | ConditionalValue<DrawerVariant[key]>
    | undefined;
};

export interface DrawerRecipe {
  __type: DrawerVariantProps;
  (props?: DrawerVariantProps): Pretty<
    Record<
      | 'trigger'
      | 'backdrop'
      | 'positioner'
      | 'content'
      | 'title'
      | 'description'
      | 'closeTrigger'
      | 'header'
      | 'body'
      | 'footer',
      string
    >
  >;
  raw: (props?: DrawerVariantProps) => DrawerVariantProps;
  variantMap: DrawerVariantMap;
  variantKeys: Array<keyof DrawerVariant>;
  splitVariantProps<Props extends DrawerVariantProps>(
    props: Props,
  ): [
    DrawerVariantProps,
    Pretty<DistributiveOmit<Props, keyof DrawerVariantProps>>,
  ];
  getVariantProps: (props?: DrawerVariantProps) => DrawerVariantProps;
}

export declare const drawer: DrawerRecipe;
