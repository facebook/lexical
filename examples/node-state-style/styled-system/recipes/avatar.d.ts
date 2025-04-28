/* eslint-disable */
import type {ConditionalValue} from '../types/index';
import type {DistributiveOmit, Pretty} from '../types/system-types';

interface AvatarVariant {
  /**
   * @default "md"
   */
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

type AvatarVariantMap = {
  [key in keyof AvatarVariant]: Array<AvatarVariant[key]>;
};

export type AvatarVariantProps = {
  [key in keyof AvatarVariant]?:
    | ConditionalValue<AvatarVariant[key]>
    | undefined;
};

export interface AvatarRecipe {
  __type: AvatarVariantProps;
  (props?: AvatarVariantProps): Pretty<
    Record<'root' | 'image' | 'fallback', string>
  >;
  raw: (props?: AvatarVariantProps) => AvatarVariantProps;
  variantMap: AvatarVariantMap;
  variantKeys: Array<keyof AvatarVariant>;
  splitVariantProps<Props extends AvatarVariantProps>(
    props: Props,
  ): [
    AvatarVariantProps,
    Pretty<DistributiveOmit<Props, keyof AvatarVariantProps>>,
  ];
  getVariantProps: (props?: AvatarVariantProps) => AvatarVariantProps;
}

export declare const avatar: AvatarRecipe;
