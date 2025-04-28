/* eslint-disable */
import type {ConditionalValue, Nested} from './conditions';
import type {AtRule, Globals, PropertiesFallback} from './csstype';
import type {SystemProperties, CssVarProperties} from './style-props';

type String = string & {};
type Number = number & {};

export type Pretty<T> = {[K in keyof T]: T[K]} & {};

export type DistributiveOmit<T, K extends keyof any> = T extends unknown
  ? Omit<T, K>
  : never;

export type DistributiveUnion<T, U> = {
  [K in keyof T]: K extends keyof U ? U[K] | T[K] : T[K];
} & DistributiveOmit<U, keyof T>;

export type Assign<T, U> = {
  [K in keyof T]: K extends keyof U ? U[K] : T[K];
} & U;

/* -----------------------------------------------------------------------------
 * Native css properties
 * -----------------------------------------------------------------------------*/

type DashedIdent = `--${string}`;

type StringToMultiple<T extends string> = T | `${T}, ${T}`;

export type PositionAreaAxis =
  | 'left'
  | 'center'
  | 'right'
  | 'x-start'
  | 'x-end'
  | 'span-x-start'
  | 'span-x-end'
  | 'x-self-start'
  | 'x-self-end'
  | 'span-x-self-start'
  | 'span-x-self-end'
  | 'span-all'
  | 'top'
  | 'bottom'
  | 'span-top'
  | 'span-bottom'
  | 'y-start'
  | 'y-end'
  | 'span-y-start'
  | 'span-y-end'
  | 'y-self-start'
  | 'y-self-end'
  | 'span-y-self-start'
  | 'span-y-self-end'
  | 'block-start'
  | 'block-end'
  | 'span-block-start'
  | 'span-block-end'
  | 'inline-start'
  | 'inline-end'
  | 'span-inline-start'
  | 'span-inline-end'
  | 'self-block-start'
  | 'self-block-end'
  | 'span-self-block-start'
  | 'span-self-block-end'
  | 'self-inline-start'
  | 'self-inline-end'
  | 'span-self-inline-start'
  | 'span-self-inline-end'
  | 'start'
  | 'end'
  | 'span-start'
  | 'span-end'
  | 'self-start'
  | 'self-end'
  | 'span-self-start'
  | 'span-self-end';

type PositionTry =
  | 'normal'
  | 'flip-block'
  | 'flip-inline'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'block-start'
  | 'block-end'
  | 'inline-start'
  | 'inline-end'
  | DashedIdent;

export interface ModernCssProperties {
  anchorName?: Globals | 'none' | DashedIdent | StringToMultiple<DashedIdent>;
  anchorScope?:
    | Globals
    | 'none'
    | 'all'
    | DashedIdent
    | StringToMultiple<DashedIdent>;
  fieldSizing?: Globals | 'fixed' | 'content';
  interpolateSize?: Globals | 'allow-keywords' | 'numeric-only';
  positionAnchor?: Globals | 'auto' | DashedIdent;
  positionArea?:
    | Globals
    | 'auto'
    | PositionAreaAxis
    | `${PositionAreaAxis} ${PositionAreaAxis}`
    | String;
  positionTry?: Globals | StringToMultiple<PositionTry> | String;
  positionTryFallback?:
    | Globals
    | 'none'
    | StringToMultiple<PositionTry>
    | String;
  positionTryOrder?:
    | Globals
    | 'normal'
    | 'most-width'
    | 'most-height'
    | 'most-block-size'
    | 'most-inline-size';
  positionVisibility?: Globals | 'always' | 'anchors-visible' | 'no-overflow';
  textWrapMode?: Globals | 'wrap' | 'nowrap';
  textSpacingTrim?:
    | Globals
    | 'normal'
    | 'space-all'
    | 'space-first'
    | 'trim-start';
  textWrapStyle?: Globals | 'auto' | 'balance' | 'pretty' | 'stable';
}

export type CssProperty = keyof PropertiesFallback;

export interface CssProperties
  extends PropertiesFallback<String | Number>,
    CssVarProperties,
    ModernCssProperties {}

export interface CssKeyframes {
  [name: string]: {
    [time: string]: CssProperties;
  };
}

/* -----------------------------------------------------------------------------
 * Conditional css properties
 * -----------------------------------------------------------------------------*/

interface GenericProperties {
  [key: string]: ConditionalValue<String | Number | boolean>;
}

/* -----------------------------------------------------------------------------
 * Native css props
 * -----------------------------------------------------------------------------*/

export type NestedCssProperties = Nested<CssProperties>;

export type SystemStyleObject = Omit<
  Nested<SystemProperties & CssVarProperties>,
  'base'
>;

export interface GlobalStyleObject {
  [selector: string]: SystemStyleObject;
}
export interface ExtendableGlobalStyleObject {
  [selector: string]: SystemStyleObject | undefined;
  extend?: GlobalStyleObject | undefined;
}

/* -----------------------------------------------------------------------------
 * Composition (text styles, layer styles)
 * -----------------------------------------------------------------------------*/

type FilterStyleObject<P extends string> = {
  [K in P]?: K extends keyof SystemStyleObject ? SystemStyleObject[K] : unknown;
};

export type CompositionStyleObject<Property extends string> = Nested<
  FilterStyleObject<Property> & CssVarProperties
>;

/* -----------------------------------------------------------------------------
 * Font face
 * -----------------------------------------------------------------------------*/

export type GlobalFontfaceRule = Omit<AtRule.FontFaceFallback, 'src'> &
  Required<Pick<AtRule.FontFaceFallback, 'src'>>;

export type FontfaceRule = Omit<GlobalFontfaceRule, 'fontFamily'>;

export interface GlobalFontface {
  [name: string]: FontfaceRule | FontfaceRule[];
}

export interface ExtendableGlobalFontface {
  [name: string]: FontfaceRule | FontfaceRule[] | GlobalFontface | undefined;
  extend?: GlobalFontface | undefined;
}

/* -----------------------------------------------------------------------------
 * Jsx style props
 * -----------------------------------------------------------------------------*/
interface WithCss {
  css?: SystemStyleObject | SystemStyleObject[];
}

export type JsxStyleProps = SystemStyleObject & WithCss;

export interface PatchedHTMLProps {
  htmlWidth?: string | number;
  htmlHeight?: string | number;
  htmlTranslate?: 'yes' | 'no' | undefined;
  htmlContent?: string;
}

export type OmittedHTMLProps =
  | 'color'
  | 'translate'
  | 'transition'
  | 'width'
  | 'height'
  | 'content';

type WithHTMLProps<T> = DistributiveOmit<T, OmittedHTMLProps> &
  PatchedHTMLProps;

export type JsxHTMLProps<
  T extends Record<string, any>,
  P extends Record<string, any> = {},
> = Assign<WithHTMLProps<T>, P>;
