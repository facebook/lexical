/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { $ReadOnly, $Diff, $Keys, $Shape } from 'utility-types';

type CSSCursor =
  | 'auto'
  | 'default'
  | 'none'
  | 'context-menu'
  | 'help'
  | 'inherit'
  | 'pointer'
  | 'progress'
  | 'wait'
  | 'cell'
  | 'crosshair'
  | 'text'
  | 'vertical-text'
  | 'alias'
  | 'copy'
  | 'move'
  | 'no-drop'
  | 'not-allowed'
  | 'e-resize'
  | 'n-resize'
  | 'ne-resize'
  | 'nw-resize'
  | 's-resize'
  | 'se-resize'
  | 'sw-resize'
  | 'w-resize'
  | 'ew-resize'
  | 'ns-resize'
  | 'nesw-resize'
  | 'nwse-resize'
  | 'col-resize'
  | 'row-resize'
  | 'all-scroll'
  | 'zoom-in'
  | 'zoom-out'
  | 'grab'
  | 'grabbing'
  | '-webkit-grab'
  | '-webkit-grabbing';

type alignContent =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'space-between'
  | 'space-around'
  | 'stretch'
  | all;
type alignItems =
  | 'start'
  | 'end'
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'baseline'
  | 'stretch'
  | all;
type alignSelf =
  | 'auto'
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'baseline'
  | 'stretch'
  | all;
type all = 'initial' | 'inherit' | 'unset';
type animationDelay = time;
type animationDirection = singleAnimationDirection;
type animationDuration = time;
type animationFillMode = singleAnimationFillMode;
type animationIterationCount = singleAnimationIterationCount;
type animationName = singleAnimationName;
type animationPlayState = singleAnimationPlayState;
type animationTimingFunction = singleTimingFunction;
type appearance = 'auto' | 'none' | 'textfield' | string;
type backdropFilter = 'none' | string;
type backfaceVisibility = 'visible' | 'hidden';
type backgroundAttachment = attachment;
type backgroundBlendMode = blendMode;
type backgroundClip = box;
type backgroundColor = color;
type backgroundImage = bgImage;
type backgroundOrigin = box;
type backgroundPosition = string;
type backgroundPositionX = string;
type backgroundPositionY = string;
type backgroundRepeat = repeatStyle;
type backgroundSize = bgSize;
type blockSize = width;
type border = borderWidth | brStyle | color;
type borderBlockEnd = borderWidth | borderStyle | color;
type borderBlockEndColor = color;
type borderBlockEndStyle = borderStyle;
type borderBlockEndWidth = borderWidth;
type borderBlockStart = borderWidth | borderStyle | color;
type borderBlockStartColor = color;
type borderBlockStartStyle = borderStyle;
type borderBlockStartWidth = borderWidth;
type borderBottomLeftRadius = lengthPercentage;
type borderBottomRightRadius = lengthPercentage;
type borderBottomStyle = brStyle;
type borderBottomWidth = borderWidth;
type borderCollapse = 'collapse' | 'separate';
type borderColor = color;
type borderImage =
  | borderImageSource
  | borderImageSlice
  | string
  | borderImageRepeat;
type borderImageOutset = string;
type borderImageRepeat = string;
type borderImageSlice = string | number | 'fill';
type borderImageSource = 'none' | string;
type borderImageWidth = string;
type borderInlineEnd = borderWidth | borderStyle | color;
type borderInlineEndColor = color;
type borderInlineEndStyle = borderStyle;
type borderInlineEndWidth = borderWidth;
type borderInlineStart = borderWidth | borderStyle | color;
type borderInlineStartColor = color;
type borderInlineStartStyle = borderStyle;
type borderInlineStartWidth = borderWidth;
type borderLeftColor = color;
type borderLeftStyle = brStyle;
type borderLeftWidth = borderWidth;
type borderRightColor = color;
type borderRightStyle = brStyle;
type borderRightWidth = borderWidth;
type borderRadius = lengthPercentage;
type borderSpacing = number;
type borderStyle = brStyle;
type borderTopLeftRadius = lengthPercentage;
type borderTopRightRadius = lengthPercentage;
type borderTopStyle = brStyle;
type borderTopWidth = borderWidth;
type boxAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch';
type boxDecorationBreak = 'slice' | 'clone';
type boxDirection = 'normal' | 'reverse' | 'inherit';
type boxFlex = number;
type boxFlexGroup = number;
type boxLines = 'single' | 'multiple';
type boxOrdinalGroup = number;
type boxOrient =
  | 'horizontal'
  | 'vertical'
  | 'inline-axis'
  | 'block-axis'
  | 'inherit';
type boxShadow = 'none' | string;
type boxSizing = 'content-box' | 'border-box';
type boxSuppress = 'show' | 'discard' | 'hide';
type breakAfter =
  | 'auto'
  | 'avoid'
  | 'avoid-page'
  | 'page'
  | 'left'
  | 'right'
  | 'recto'
  | 'verso'
  | 'avoid-column'
  | 'column'
  | 'avoid-region'
  | 'region';
type breakBefore =
  | 'auto'
  | 'avoid'
  | 'avoid-page'
  | 'page'
  | 'left'
  | 'right'
  | 'recto'
  | 'verso'
  | 'avoid-column'
  | 'column'
  | 'avoid-region'
  | 'region';
type breakInside =
  | 'auto'
  | 'avoid'
  | 'avoid-page'
  | 'avoid-column'
  | 'avoid-region';
type captionSide =
  | 'top'
  | 'bottom'
  | 'block-start'
  | 'block-end'
  | 'inline-start'
  | 'inline-end';
type clear = 'none' | 'left' | 'right' | 'both' | 'inline-start' | 'inline-end';
type clip = string | 'auto';
type clipPath = string | 'none';
type columnCount = number | 'auto';
type columnFill = 'auto' | 'balance';
type columnGap = number | string | 'normal';
type columnRule = columnRuleWidth | columnRuleStyle | columnRuleColor;
type columnRuleColor = color;
type columnRuleStyle = brStyle;
type columnRuleWidth = borderWidth;
type columnSpan = 'none' | 'all';
type columnWidth = number | 'auto';
type columns = columnWidth | columnCount;
type contain = 'none' | 'strict' | 'content' | string;
type content = string;
type counterIncrement = string | 'none';
type counterReset = string | 'none';
type cursor = CSSCursor;
type direction = 'ltr' | 'rtl' | 'inherit';
type display =
  | 'none'
  | 'inherit'
  | 'inline'
  | 'block'
  | 'list-item'
  | 'inline-list-item'
  | 'inline-block'
  | 'inline-table'
  | 'table'
  | 'table-cell'
  | 'table-column'
  | 'table-column-group'
  | 'table-footer-group'
  | 'table-header-group'
  | 'table-row'
  | 'table-row-group'
  | 'flex'
  | 'inline-flex'
  | 'grid'
  | 'inline-grid'
  | 'run-in'
  | 'ruby'
  | 'ruby-base'
  | 'ruby-text'
  | 'ruby-base-container'
  | 'ruby-text-container'
  | 'contents';
type displayInside = 'auto' | 'block' | 'table' | 'flex' | 'grid' | 'ruby';
type displayList = 'none' | 'list-item';
type displayOutside =
  | 'block-level'
  | 'inline-level'
  | 'run-in'
  | 'contents'
  | 'none'
  | 'table-row-group'
  | 'table-header-group'
  | 'table-footer-group'
  | 'table-row'
  | 'table-cell'
  | 'table-column-group'
  | 'table-column'
  | 'table-caption'
  | 'ruby-base'
  | 'ruby-text'
  | 'ruby-base-container'
  | 'ruby-text-container';
type emptyCells = 'show' | 'hide';
type filter = 'none' | string;
type flex = 'none' | string | number;
type flexBasis = 'content' | number | string | 'inherit';
type flexDirection =
  | 'row'
  | 'row-reverse'
  | 'column'
  | 'column-reverse'
  | 'inherit';
type flexFlow = flexDirection | flexWrap;
type flexGrow = number | 'inherit';
type flexShrink = number | 'inherit';
type flexWrap = 'nowrap' | 'wrap' | 'wrap-reverse' | 'inherit';
type float =
  | 'left'
  | 'right'
  | 'none'
  | 'start'
  | 'end'
  | 'inline-start'
  | 'inline-end'
  | 'inherit';
type fontFamily = string;
type fontFeatureSettings = 'normal' | string;
type fontKerning = 'auto' | 'normal' | 'none';
type fontLanguageOverride = 'normal' | string;
type fontSize = absoluteSize | relativeSize | lengthPercentage;
type fontSizeAdjust = 'none' | number;
type fontStretch =
  | 'normal'
  | 'ultra-condensed'
  | 'extra-condensed'
  | 'condensed'
  | 'semi-condensed'
  | 'semi-expanded'
  | 'expanded'
  | 'extra-expanded'
  | 'ultra-expanded';
type fontStyle = 'normal' | 'italic' | 'oblique';
type fontSynthesis = 'none' | string;
type fontVariant = 'normal' | 'none' | string;
type fontVariantAlternates = 'normal' | string;
type fontVariantCaps =
  | 'normal'
  | 'small-caps'
  | 'all-small-caps'
  | 'petite-caps'
  | 'all-petite-caps'
  | 'unicase'
  | 'titling-caps';
type fontVariantEastAsian = 'normal' | string;
type fontVariantLigatures = 'normal' | 'none' | string;
type fontVariantNumeric = 'normal' | string;
type fontVariantPosition = 'normal' | 'sub' | 'super';
type fontWeight =
  | 'inherit'
  | 'normal'
  | 'bold'
  | 'bolder'
  | 'lighter'
  | 100
  | 200
  | 300
  | 400
  | 500
  | 600
  | 700
  | 800
  | 900;
type grid = gridTemplate | string;
type gridArea = gridLine | string;
type gridAutoColumns = trackSize;
type gridAutoFlow = string | 'dense';
type gridAutoRows = trackSize;
type gridColumn = gridLine | string;
type gridColumnEnd = gridLine;
type gridColumnGap = lengthPercentage;
type gridColumnStart = gridLine;
type gridGap = gridRowGap | gridColumnGap;
type gridRow = gridLine | string;
type gridRowEnd = gridLine;
type gridRowGap = lengthPercentage;
type gridRowStart = gridLine;
type gridTemplate = 'none' | 'subgrid' | string;
type gridTemplateAreas = 'none' | string;
type gridTemplateColumns = 'none' | 'subgrid' | string;
type gridTemplateRows = 'none' | 'subgrid' | string;
type hyphens = 'none' | 'manual' | 'auto';
type imageOrientation = 'from-image' | number | string;
type imageRendering =
  | 'auto'
  | 'crisp-edges'
  | 'pixelated'
  | 'optimizeSpeed'
  | 'optimizeQuality'
  | string;
type imageResolution = string | 'snap';
type imeMode = 'auto' | 'normal' | 'active' | 'inactive' | 'disabled';
type initialLetter = 'normal' | string;
type initialLetterAlign = string;
type inlineSize = width;
type isolation = 'auto' | 'isolate';
type justifyContent =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'space-between'
  | 'space-around'
  | 'space-evenly'
  | 'inherit';
type justifyItems =
  | 'start'
  | 'end'
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'baseline'
  | 'stretch'
  | all;
type justifySelf =
  | 'auto'
  | 'normal'
  | 'stretch'
  | baselinePosition
  | selfPosition
  | 'left'
  | 'right';
type letterSpacing = 'normal' | lengthPercentage;
type lineBreak = 'auto' | 'loose' | 'normal' | 'strict';
type lineHeight = 'inherit' | number;
type listStyle = listStyleType | listStylePosition | listStyleImage;
type listStyleImage = string | 'none';
type listStylePosition = 'inside' | 'outside';
type listStyleType = string | 'none';
type margin = number | string;
type marginBlockEnd = marginLeft;
type marginBlockStart = marginLeft;
type marginBottom = number | string | 'auto';
type marginInlineEnd = marginLeft;
type marginInlineStart = marginLeft;
type marginLeft = number | string | 'auto';
type marginRight = number | string | 'auto';
type marginTop = number | string | 'auto';
type markerOffset = number | 'auto';
type mask = maskLayer;
type maskClip = string;
type maskComposite = compositeOperator;
type maskMode = maskingMode;
type maskOrigin = geometryBox;
type maskPosition = string;
type maskRepeat = repeatStyle;
type maskSize = bgSize;
type maskType = 'luminance' | 'alpha';
type maxBlockSize = maxWidth;
type maxHeight =
  | number
  | string
  | 'none'
  | 'max-content'
  | 'min-content'
  | 'fit-content'
  | 'fill-available';
type maxInlineSize = maxWidth;
type maxWidth =
  | number
  | string
  | 'none'
  | 'max-content'
  | 'min-content'
  | 'fit-content'
  | 'fill-available';
type minBlockSize = minWidth;
type minHeight =
  | number
  | string
  | 'auto'
  | 'max-content'
  | 'min-content'
  | 'fit-content'
  | 'fill-available';
type minInlineSize = minWidth;
type minWidth =
  | number
  | string
  | 'auto'
  | 'max-content'
  | 'min-content'
  | 'fit-content'
  | 'fill-available';
type mixBlendMode = blendMode;
type motion = motionPath | motionOffset | motionRotation;
type motionOffset = lengthPercentage;
type motionPath = string | geometryBox | 'none';
type motionRotation = string | number;
type objectFit = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down';
type objectPosition = string;
type offsetBlockEnd = string;
type offsetBlockStart = string;
type offsetInlineEnd = string;
type offsetInlineStart = string;
type opacity = number;
type order = number;
type orphans = number;
type lexical = string;
type lexicalColor = color | 'invert';
type lexicalOffset = number;
type lexicalStyle = 'auto' | brStyle;
type lexicalWidth = borderWidth;
type overflow = 'visible' | 'hidden' | 'scroll' | 'auto';
type overflowAnchor = 'auto' | 'none';
type overflowClipBox = 'padding-box' | 'content-box';
type overflowWrap = 'normal' | 'break-word';
type overflowX = 'visible' | 'hidden' | 'scroll' | 'auto';
type overflowY = 'visible' | 'hidden' | 'scroll' | 'auto';
type overscrollBehavior = 'none' | 'contain' | 'auto';
type overscrollBehaviorX = 'none' | 'contain' | 'auto';
type overscrollBehaviorY = 'none' | 'contain' | 'auto';
type padding = number | string;
type paddingBlockEnd = paddingLeft;
type paddingBlockStart = paddingLeft;
type paddingBottom = number | string;
type paddingLeft = number | string;
type paddingRight = number | string;
type paddingTop = number | string;
type pageBreakAfter = 'auto' | 'always' | 'avoid' | 'left' | 'right';
type pageBreakBefore = 'auto' | 'always' | 'avoid' | 'left' | 'right';
type pageBreakInside = 'auto' | 'avoid';
type perspective = 'none' | number;
type perspectiveOrigin = string;
type pointerEvents =
  | 'auto'
  | 'none'
  | 'visiblePainted'
  | 'visibleFill'
  | 'visibleStroke'
  | 'visible'
  | 'painted'
  | 'fill'
  | 'stroke'
  | 'all'
  | 'inherit';
type position = 'static' | 'relative' | 'absolute' | 'sticky' | 'fixed';
type quotes = string | 'none';
type resize = 'none' | 'both' | 'horizontal' | 'vertical';
type rubyAlign = 'start' | 'center' | 'space-between' | 'space-around';
type rubyMerge = 'separate' | 'collapse' | 'auto';
type rubyPosition = 'over' | 'under' | 'inter-character';
type scrollBehavior = 'auto' | 'smooth';
type scrollSnapAlign = 'none' | 'start' | 'end' | 'center';
type scrollSnapType = 'none' | 'x mandatory' | 'y mandatory';
type selfPosition =
  | 'center'
  | 'start'
  | 'end'
  | 'self-start'
  | 'self-end'
  | 'flex-start'
  | 'flex-end';
type shapeImageThreshold = number;
type shapeMargin = lengthPercentage;
type shapeOutside = 'none' | shapeBox | string;
type tabSize = number;
type tableLayout = 'auto' | 'fixed';
type textAlign =
  | 'start'
  | 'end'
  | 'left'
  | 'right'
  | 'center'
  | 'justify'
  | 'match-parent'
  | 'inherit';
type textAlignLast =
  | 'auto'
  | 'start'
  | 'end'
  | 'left'
  | 'right'
  | 'center'
  | 'justify'
  | 'inherit';
type textCombineUpright = 'none' | 'all' | string;
type textDecoration =
  | textDecorationLine
  | textDecorationStyle
  | textDecorationColor;
type textDecorationColor = color;
type textDecorationLine = 'none' | string;
type textDecorationSkip = 'none' | string;
type textDecorationStyle = 'solid' | 'double' | 'dotted' | 'dashed' | 'wavy';
type textEmphasis = textEmphasisStyle | textEmphasisColor;
type textEmphasisColor = color;
type textEmphasisPosition = string;
type textEmphasisStyle = 'none' | string;
type textIndent = lengthPercentage | 'hanging' | 'each-line';
type textOrientation = 'mixed' | 'upright' | 'sideways';
type textOverflow = string;
type textRendering =
  | 'auto'
  | 'optimizeSpeed'
  | 'optimizeLegibility'
  | 'geometricPrecision';
type textShadow = 'none' | string;
type textSizeAdjust = 'none' | 'auto' | string;
type textTransform =
  | 'none'
  | 'capitalize'
  | 'uppercase'
  | 'lowercase'
  | 'full-width';
type textUnderlinePosition = 'auto' | string;
type touchAction = 'auto' | 'none' | string | 'manipulation';
type transform = 'none' | string;
type transformBox = 'border-box' | 'fill-box' | 'view-box';
type transformOrigin = string | number;
type transformStyle = 'flat' | 'preserve-3d';
type transition = singleTransition;
type transitionDelay = time;
type transitionDuration = time;
type transitionProperty = 'none' | singleTransitionProperty;
type transitionTimingFunction = singleTransitionTimingFunction;
type unicodeBidi =
  | 'normal'
  | 'embed'
  | 'isolate'
  | 'bidi-override'
  | 'isolate-override'
  | 'plaintext';
type userSelect = 'auto' | 'text' | 'none' | 'contain' | 'all';
type verticalAlign =
  | 'baseline'
  | 'sub'
  | 'super'
  | 'text-top'
  | 'text-bottom'
  | 'middle'
  | 'top'
  | 'bottom'
  | string
  | number;
type visibility = 'visible' | 'hidden' | 'collapse';
type whiteSpace =
  | 'normal'
  | 'pre'
  | 'nowrap'
  | 'pre-wrap'
  | 'pre-line'
  | 'initial'
  | 'inherit';
type widows = number;
type width =
  | string
  | number
  | 'available'
  | 'min-content'
  | 'max-content'
  | 'fit-content'
  | 'auto';
type willChange = 'auto' | animatableFeature;
type wordBreak = 'normal' | 'break-all' | 'keep-all' | nonStandardWordBreak;
type wordSpacing = 'normal' | lengthPercentage;
type wordWrap = 'normal' | 'break-word';
type writingMode =
  | 'horizontal-tb'
  | 'vertical-rl'
  | 'vertical-lr'
  | 'sideways-rl'
  | 'sideways-lr'
  | svgWritingMode;
type zIndex = 'auto' | number;
type alignmentBaseline =
  | 'auto'
  | 'baseline'
  | 'before-edge'
  | 'text-before-edge'
  | 'middle'
  | 'central'
  | 'after-edge'
  | 'text-after-edge'
  | 'ideographic'
  | 'alphabetic'
  | 'hanging'
  | 'mathematical';
type baselinePosition = 'baseline' | 'first baseline' | 'last baseline';
type baselineShift = 'baseline' | 'sub' | 'super' | svgLength;
type behavior = string;
type clipRule = 'nonzero' | 'evenodd';
type cue = cueBefore | cueAfter;
type cueAfter = string | number | 'none';
type cueBefore = string | number | 'none';
type dominantBaseline =
  | 'auto'
  | 'use-script'
  | 'no-change'
  | 'reset-size'
  | 'ideographic'
  | 'alphabetic'
  | 'hanging'
  | 'mathematical'
  | 'central'
  | 'middle'
  | 'text-after-edge'
  | 'text-before-edge';
type fill = paint;
type fillOpacity = number;
type fillRule = 'nonzero' | 'evenodd';
type glyphOrientationHorizontal = number;
type glyphOrientationVertical = number;
type kerning = 'auto' | svgLength;
type marker = 'none' | string;
type markerEnd = 'none' | string;
type markerMid = 'none' | string;
type markerStart = 'none' | string;
type pause = pauseBefore | pauseAfter;
type pauseAfter =
  | number
  | 'none'
  | 'x-weak'
  | 'weak'
  | 'medium'
  | 'strong'
  | 'x-strong';
type pauseBefore =
  | number
  | 'none'
  | 'x-weak'
  | 'weak'
  | 'medium'
  | 'strong'
  | 'x-strong';
type rest = restBefore | restAfter;
type restAfter =
  | number
  | 'none'
  | 'x-weak'
  | 'weak'
  | 'medium'
  | 'strong'
  | 'x-strong';
type restBefore =
  | number
  | 'none'
  | 'x-weak'
  | 'weak'
  | 'medium'
  | 'strong'
  | 'x-strong';
type shapeRendering =
  | 'auto'
  | 'optimizeSpeed'
  | 'crispEdges'
  | 'geometricPrecision';
type src = string;
type speak = 'auto' | 'none' | 'normal';
type speakAs = 'normal' | 'spell-out' | 'digits' | string;
type stroke = paint;
type strokeDasharray = 'none' | string;
type strokeDashoffset = svgLength;
type strokeLinecap = 'butt' | 'round' | 'square';
type strokeLinejoin = 'miter' | 'round' | 'bevel';
type strokeMiterlimit = number;
type strokeOpacity = number;
type strokeWidth = svgLength;
type textAnchor = 'start' | 'middle' | 'end';
type unicodeRange = string;
type voiceBalance =
  | number
  | 'left'
  | 'center'
  | 'right'
  | 'leftwards'
  | 'rightwards';
type voiceDuration = 'auto' | time;
type voiceFamily = string | 'preserve';
type voicePitch = number | 'absolute' | string;
type voiceRange = number | 'absolute' | string;
type voiceRate = string;
type voiceStress = 'normal' | 'strong' | 'moderate' | 'none' | 'reduced';
type voiceVolume = 'silent' | string;
type absoluteSize =
  | 'xx-small'
  | 'x-small'
  | 'small'
  | 'medium'
  | 'large'
  | 'x-large'
  | 'xx-large';
type animatableFeature = 'scroll-position' | 'contents' | string;
type attachment = 'scroll' | 'fixed' | 'local';
type bgImage = 'none' | string;
type bgSize = string | 'cover' | 'contain';
type box = 'border-box' | 'padding-box' | 'content-box';
type brStyle =
  | 'none'
  | 'hidden'
  | 'dotted'
  | 'dashed'
  | 'solid'
  | 'double'
  | 'groove'
  | 'ridge'
  | 'inset'
  | 'outset';
type borderWidth = number | 'thin' | 'medium' | 'thick' | string;
type color = string;
type compositeOperator = 'add' | 'subtract' | 'intersect' | 'exclude';
type geometryBox = shapeBox | 'fill-box' | 'stroke-box' | 'view-box';
type gridLine = 'auto' | string;
type lengthPercentage = number | string;
type maskLayer =
  | maskReference
  | maskingMode
  | string
  | repeatStyle
  | geometryBox
  | compositeOperator;
type maskReference = 'none' | string;
type maskingMode = 'alpha' | 'luminance' | 'match-source';
type relativeSize = 'larger' | 'smaller';
type repeatStyle = 'repeat-x' | 'repeat-y' | string;
type shapeBox = box | 'margin-box';
type singleAnimationDirection =
  | 'normal'
  | 'reverse'
  | 'alternate'
  | 'alternate-reverse';
type singleAnimationFillMode = 'none' | 'forwards' | 'backwards' | 'both';
type singleAnimationIterationCount = 'infinite' | number;
type singleAnimationName = 'none' | string;
type singleAnimationPlayState = 'running' | 'paused';
type singleTimingFunction = singleTransitionTimingFunction;
type singleTransition = singleTransitionTimingFunction | string | number;
type singleTransitionTimingFunction =
  | 'ease'
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'step-start'
  | 'step-end'
  | string;
type singleTransitionProperty = 'all' | string;
type time = string;
type trackBreadth =
  | lengthPercentage
  | string
  | 'min-content'
  | 'max-content'
  | 'auto';
type trackSize = trackBreadth | string;
type nonStandardWordBreak = 'break-word';
type blendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';
type maskImage = maskReference;
type paint = 'none' | 'currentColor' | color | string;
type svgLength = string | number;
type svgWritingMode = 'lr-tb' | 'rl-tb' | 'tb-rl' | 'lr' | 'rl' | 'tb';
type top = number | string;
type MsOverflowStyle =
  | 'auto'
  | 'none'
  | 'scrollbar'
  | '-ms-autohiding-scrollbar';

type OptionalArray<T> = Array<T> | T;

type SupportedVendorSpecificCSSProperties = $ReadOnly<{
  MozOsxFontSmoothing?: 'grayscale';
  WebkitAppearance?: appearance;
  WebkitFontSmoothing?: 'antialiased';
  WebkitTapHighlightColor?: color;
}>;

type CSSProperties = $ReadOnly<
  SupportedVendorSpecificCSSProperties & {
    theme?: string;
    alignContent?: alignContent;
    alignItems?: alignItems;
    alignSelf?: alignSelf;
    alignmentBaseline?: alignmentBaseline;
    all?: all;
    animationDelay?: OptionalArray<animationDelay>;
    animationDirection?: OptionalArray<animationDirection>;
    animationDuration?: OptionalArray<animationDuration>;
    animationFillMode?: OptionalArray<animationFillMode>;
    animationIterationCount?: OptionalArray<animationIterationCount>;
    animationName?: OptionalArray<animationName>;
    animationPlayState?: OptionalArray<animationPlayState>;
    animationTimingFunction?: OptionalArray<animationTimingFunction>;
    appearance?: appearance;
    backdropFilter?: backdropFilter;
    backfaceVisibility?: backfaceVisibility;
    backgroundAttachment?: OptionalArray<backgroundAttachment>;
    backgroundBlendMode?: OptionalArray<backgroundBlendMode>;
    backgroundClip?: OptionalArray<backgroundClip>;
    backgroundColor?: backgroundColor;
    backgroundImage?: OptionalArray<backgroundImage>;
    backgroundOrigin?: OptionalArray<backgroundOrigin>;
    backgroundPosition?: OptionalArray<backgroundPosition>;
    backgroundPositionX?: OptionalArray<backgroundPositionX>;
    backgroundPositionY?: OptionalArray<backgroundPositionY>;
    backgroundRepeat?: OptionalArray<backgroundRepeat>;
    backgroundSize?: OptionalArray<backgroundSize>;
    baselineShift?: baselineShift;
    behavior?: behavior;
    blockSize?: blockSize;
    border?: border;
    borderBlockEnd?: borderBlockEnd;
    borderBlockEndColor?: borderBlockEndColor;
    borderBlockEndStyle?: borderBlockEndStyle;
    borderBlockEndWidth?: borderBlockEndWidth;
    borderBlockStart?: borderBlockStart;
    borderBlockStartColor?: borderBlockStartColor;
    borderBlockStartStyle?: borderBlockStartStyle;
    borderBlockStartWidth?: borderBlockStartWidth;
    borderBottom?: border;
    borderBottomColor?: color;
    borderBottomEndRadius?: borderBottomRightRadius;
    borderBottomLeftRadius?: borderBottomLeftRadius;
    borderBottomRightRadius?: borderBottomRightRadius;
    borderBottomStartRadius?: borderBottomLeftRadius;
    borderBottomStyle?: borderBottomStyle;
    borderBottomWidth?: borderBottomWidth;
    borderCollapse?: borderCollapse;
    borderColor?: borderColor;
    borderEnd?: border;
    borderEndColor?: borderRightColor;
    borderEndStyle?: borderRightStyle;
    borderEndWidth?: borderRightWidth;
    borderImage?: borderImage;
    borderImageOutset?: borderImageOutset;
    borderImageRepeat?: borderImageRepeat;
    borderImageSlice?: borderImageSlice;
    borderImageSource?: borderImageSource;
    borderImageWidth?: borderImageWidth;
    borderInlineEnd?: borderInlineEnd;
    borderInlineEndColor?: borderInlineEndColor;
    borderInlineEndStyle?: borderInlineEndStyle;
    borderInlineEndWidth?: borderInlineEndWidth;
    borderInlineStart?: borderInlineStart;
    borderInlineStartColor?: borderInlineStartColor;
    borderInlineStartStyle?: borderInlineStartStyle;
    borderInlineStartWidth?: borderInlineStartWidth;
    borderLeft?: border;
    borderLeftColor?: borderLeftColor;
    borderLeftStyle?: borderLeftStyle;
    borderLeftWidth?: borderLeftWidth;
    borderRadius?: borderRadius;
    borderRight?: border;
    borderRightColor?: borderRightColor;
    borderRightStyle?: borderRightStyle;
    borderRightWidth?: borderRightWidth;
    borderSpacing?: borderSpacing;
    borderStart?: border;
    borderStartColor?: borderLeftColor;
    borderStartStyle?: borderLeftStyle;
    borderStartWidth?: borderLeftWidth;
    borderStyle?: borderStyle;
    borderTop?: border;
    borderTopColor?: color;
    borderTopEndRadius?: borderTopRightRadius;
    borderTopLeftRadius?: borderTopLeftRadius;
    borderTopRightRadius?: borderTopRightRadius;
    borderTopStartRadius?: borderTopLeftRadius;
    borderTopStyle?: borderTopStyle;
    borderTopWidth?: borderTopWidth;
    borderWidth?: borderWidth;
    bottom?: number | string;
    boxAlign?: boxAlign;
    boxDecorationBreak?: boxDecorationBreak;
    boxDirection?: boxDirection;
    boxFlex?: boxFlex;
    boxFlexGroup?: boxFlexGroup;
    boxLines?: boxLines;
    boxOrdinalGroup?: boxOrdinalGroup;
    boxOrient?: boxOrient;
    boxShadow?: OptionalArray<boxShadow>;
    boxSizing?: boxSizing;
    boxSuppress?: boxSuppress;
    breakAfter?: breakAfter;
    breakBefore?: breakBefore;
    breakInside?: breakInside;
    captionSide?: captionSide;
    clear?: clear;
    clip?: clip;
    clipPath?: clipPath;
    clipRule?: clipRule;
    color?: color;
    columnCount?: columnCount;
    columnFill?: columnFill;
    columnGap?: columnGap;
    columnRule?: columnRule;
    columnRuleColor?: columnRuleColor;
    columnRuleStyle?: columnRuleStyle;
    columnRuleWidth?: columnRuleWidth;
    columnSpan?: columnSpan;
    columnWidth?: columnWidth;
    columns?: columns;
    contain?: contain;
    content?: content;
    counterIncrement?: counterIncrement;
    counterReset?: counterReset;
    cue?: cue;
    cueAfter?: cueAfter;
    cueBefore?: cueBefore;
    cursor?: OptionalArray<cursor>;
    direction?: direction;
    display?: display;
    displayInside?: displayInside;
    displayList?: displayList;
    displayOutside?: displayOutside;
    dominantBaseline?: dominantBaseline;
    emptyCells?: emptyCells;
    end?: number | string;
    fill?: fill;
    fillOpacity?: fillOpacity;
    fillRule?: fillRule;
    filter?: filter;
    flex?: flex;
    flexBasis?: flexBasis;
    flexDirection?: flexDirection;
    flexFlow?: flexFlow;
    flexGrow?: flexGrow;
    flexShrink?: flexShrink;
    flexWrap?: flexWrap;
    float?: float;
    fontFamily?: fontFamily;
    fontFeatureSettings?: fontFeatureSettings;
    fontKerning?: fontKerning;
    fontLanguageOverride?: fontLanguageOverride;
    fontSize?: fontSize;
    fontSizeAdjust?: fontSizeAdjust;
    fontStretch?: fontStretch;
    fontStyle?: fontStyle;
    fontSynthesis?: fontSynthesis;
    fontVariant?: fontVariant;
    fontVariantAlternates?: fontVariantAlternates;
    fontVariantCaps?: fontVariantCaps;
    fontVariantEastAsian?: fontVariantEastAsian;
    fontVariantLigatures?: fontVariantLigatures;
    fontVariantNumeric?: fontVariantNumeric;
    fontVariantPosition?: fontVariantPosition;
    fontWeight?: fontWeight;
    glyphOrientationHorizontal?: glyphOrientationHorizontal;
    glyphOrientationVertical?: glyphOrientationVertical;
    grid?: grid;
    gridArea?: gridArea;
    gridAutoColumns?: gridAutoColumns;
    gridAutoFlow?: gridAutoFlow;
    gridAutoRows?: gridAutoRows;
    gridColumn?: gridColumn;
    gridColumnEnd?: gridColumnEnd;
    gridColumnGap?: gridColumnGap;
    gridColumnStart?: gridColumnStart;
    gridGap?: gridGap;
    gridRow?: gridRow;
    gridRowEnd?: gridRowEnd;
    gridRowGap?: gridRowGap;
    gridRowStart?: gridRowStart;
    gridTemplate?: gridTemplate;
    gridTemplateAreas?: gridTemplateAreas;
    gridTemplateColumns?: gridTemplateColumns;
    gridTemplateRows?: gridTemplateRows;
    height?: number | string;
    hyphens?: hyphens;
    imageOrientation?: imageOrientation;
    imageRendering?: imageRendering;
    imageResolution?: imageResolution;
    imeMode?: imeMode;
    initialLetter?: initialLetter;
    initialLetterAlign?: initialLetterAlign;
    inlineSize?: inlineSize;
    isolation?: isolation;
    justifyContent?: justifyContent;
    justifyItems?: justifyItems;
    justifySelf?: justifySelf;
    kerning?: kerning;
    left?: number | string;
    letterSpacing?: letterSpacing;
    lineBreak?: lineBreak;
    lineHeight?: lineHeight;
    listStyle?: listStyle;
    listStyleImage?: listStyleImage;
    listStylePosition?: listStylePosition;
    listStyleType?: listStyleType;
    margin?: margin;
    marginBlockEnd?: marginBlockEnd;
    marginBlockStart?: marginBlockStart;
    marginBottom?: marginBottom;
    marginEnd?: marginRight;
    marginHorizontal?: marginLeft;
    marginInlineEnd?: marginInlineEnd;
    marginInlineStart?: marginInlineStart;
    marginLeft?: marginLeft;
    marginRight?: marginRight;
    marginStart?: marginLeft;
    marginTop?: marginTop;
    marginVertical?: marginTop;
    marker?: marker;
    markerEnd?: markerEnd;
    markerMid?: markerMid;
    markerOffset?: markerOffset;
    markerStart?: markerStart;
    mask?: mask;
    maskClip?: maskClip;
    maskComposite?: maskComposite;
    maskImage?: maskImage;
    maskMode?: maskMode;
    maskOrigin?: maskOrigin;
    maskPosition?: maskPosition;
    maskRepeat?: maskRepeat;
    maskSize?: maskSize;
    maskType?: maskType;
    maxBlockSize?: maxBlockSize;
    maxHeight?: maxHeight;
    maxInlineSize?: maxInlineSize;
    maxWidth?: maxWidth;
    minBlockSize?: minBlockSize;
    minHeight?: minHeight;
    minInlineSize?: minInlineSize;
    minWidth?: minWidth;
    mixBlendMode?: mixBlendMode;
    motion?: motion;
    motionOffset?: motionOffset;
    motionPath?: motionPath;
    motionRotation?: motionRotation;
    MsOverflowStyle?: MsOverflowStyle;
    objectFit?: objectFit;
    objectPosition?: objectPosition;
    offsetBlockEnd?: offsetBlockEnd;
    offsetBlockStart?: offsetBlockStart;
    offsetInlineEnd?: offsetInlineEnd;
    offsetInlineStart?: offsetInlineStart;
    opacity?: opacity;
    order?: order;
    orphans?: orphans;
    lexical?: lexical;
    lexicalColor?: lexicalColor;
    lexicalOffset?: lexicalOffset;
    lexicalStyle?: lexicalStyle;
    lexicalWidth?: lexicalWidth;
    overflow?: overflow;
    overflowAnchor?: overflowAnchor;
    overflowClipBox?: overflowClipBox;
    overflowWrap?: overflowWrap;
    overflowX?: overflowX;
    overflowY?: overflowY;
    overscrollBehavior?: overscrollBehavior;
    overscrollBehaviorX?: overscrollBehaviorX;
    overscrollBehaviorY?: overscrollBehaviorY;
    padding?: padding;
    paddingBlockEnd?: paddingBlockEnd;
    paddingBlockStart?: paddingBlockStart;
    paddingBottom?: paddingBottom;
    paddingEnd?: paddingBottom;
    paddingHorizontal?: paddingLeft;
    paddingLeft?: paddingLeft;
    paddingRight?: paddingRight;
    paddingStart?: paddingLeft;
    paddingTop?: paddingTop;
    paddingVertical?: paddingTop;
    pageBreakAfter?: pageBreakAfter;
    pageBreakBefore?: pageBreakBefore;
    pageBreakInside?: pageBreakInside;
    pause?: pause;
    pauseAfter?: pauseAfter;
    pauseBefore?: pauseBefore;
    perspective?: perspective;
    perspectiveOrigin?: perspectiveOrigin;
    pointerEvents?: pointerEvents;
    position?: position;
    quotes?: quotes;
    resize?: resize;
    rest?: rest;
    restAfter?: restAfter;
    restBefore?: restBefore;
    right?: number | string;
    rubyAlign?: rubyAlign;
    rubyMerge?: rubyMerge;
    rubyPosition?: rubyPosition;
    scrollbarWidth?: string | number;
    scrollBehavior?: scrollBehavior;
    scrollPadding?: number;
    scrollPaddingTop?: number;
    scrollPaddingBottom?: number;
    scrollSnapAlign?: scrollSnapAlign;
    scrollSnapType?: scrollSnapType;
    shapeImageThreshold?: shapeImageThreshold;
    shapeMargin?: shapeMargin;
    shapeOutside?: shapeOutside;
    shapeRendering?: shapeRendering;
    speak?: speak;
    speakAs?: speakAs;
    src?: src;
    start?: number | string;
    stroke?: stroke;
    strokeDasharray?: strokeDasharray;
    strokeDashoffset?: strokeDashoffset;
    strokeLinecap?: strokeLinecap;
    strokeLinejoin?: strokeLinejoin;
    strokeMiterlimit?: strokeMiterlimit;
    strokeOpacity?: strokeOpacity;
    strokeWidth?: strokeWidth;
    tabSize?: tabSize;
    tableLayout?: tableLayout;
    textAlign?: textAlign;
    textAlignLast?: textAlignLast;
    textAnchor?: textAnchor;
    textCombineUpright?: textCombineUpright;
    textDecoration?: textDecoration;
    textDecorationColor?: textDecorationColor;
    textDecorationLine?: textDecorationLine;
    textDecorationSkip?: textDecorationSkip;
    textDecorationStyle?: textDecorationStyle;
    textEmphasis?: textEmphasis;
    textEmphasisColor?: textEmphasisColor;
    textEmphasisPosition?: textEmphasisPosition;
    textEmphasisStyle?: textEmphasisStyle;
    textIndent?: textIndent;
    textOrientation?: textOrientation;
    textOverflow?: textOverflow;
    textRendering?: textRendering;
    textShadow?: OptionalArray<textShadow>;
    textSizeAdjust?: textSizeAdjust;
    textTransform?: textTransform;
    textUnderlinePosition?: textUnderlinePosition;
    top?: top;
    touchAction?: touchAction;
    transform?: transform;
    transformBox?: transformBox;
    transformOrigin?: transformOrigin;
    transformStyle?: transformStyle;
    transition?: OptionalArray<transition>;
    transitionDelay?: OptionalArray<transitionDelay>;
    transitionDuration?: OptionalArray<transitionDuration>;
    transitionProperty?: OptionalArray<transitionProperty>;
    transitionTimingFunction?: OptionalArray<transitionTimingFunction>;
    unicodeBidi?: unicodeBidi;
    unicodeRange?: unicodeRange;
    userSelect?: userSelect;
    verticalAlign?: verticalAlign;
    visibility?: visibility;
    voiceBalance?: voiceBalance;
    voiceDuration?: voiceDuration;
    voiceFamily?: voiceFamily;
    voicePitch?: voicePitch;
    voiceRange?: voiceRange;
    voiceRate?: voiceRate;
    voiceStress?: voiceStress;
    voiceVolume?: voiceVolume;
    whiteSpace?: whiteSpace;
    widows?: widows;
    width?: width;
    willChange?: willChange;
    wordBreak?: wordBreak;
    wordSpacing?: wordSpacing;
    wordWrap?: wordWrap;
    writingMode?: writingMode;
    zIndex?: zIndex;
  }
>;

type StyleXClassNameFor<_K, _V> = string;
type StyleXClassNameForValue<V> = StyleXClassNameFor<unknown, V>;
type StyleXClassNameForKey<K> = StyleXClassNameFor<K, unknown>;
type StyleXClassName = StyleXClassNameFor<unknown, unknown>;
// Type for arbitrarily nested Array.
type StyleXArray<T> = T | ReadonlyArray<StyleXArray<T>>;
type CSSPropTypes = $ReadOnly<$ObjMap<CSSProperties, () => StyleXClassName>>;
type NestedCSSPropTypes = $ReadOnly<
  CSSPropTypes & {
    // NOTE: the actual type should be nested objects.
    // fix after the types in stylex.js are fixed.
    ':active'?: StyleXClassName;
    ':focus'?: StyleXClassName;
    ':focus-visible'?: StyleXClassName;
    ':hover'?: StyleXClassName;
    ':disabled'?: StyleXClassName;
    ':empty'?: StyleXClassName;
    ':first-child'?: StyleXClassName;
    ':last-child'?: StyleXClassName;
    '::before'?: StyleXClassName;
    '::after'?: StyleXClassName;
    '::placeholder'?: StyleXClassName;
    '::-webkit-scrollbar'?: StyleXClassName;
    // Find a better way to do this. Being forced to add every media query.
    '@media (max-width: 564px)'?: StyleXClassName;
    '@media (min-height: 700px)'?: StyleXClassName;
    '@media (min-height: 700px) and (max-height: 789px)'?: StyleXClassName;
    '@media (min-height: 753px) and (max-height: 789px)'?: StyleXClassName;
    '@media (min-height: 790px)'?: StyleXClassName;
    '@media (max-width: 648px)'?: StyleXClassName;
    '@media (max-width: 899px)'?: StyleXClassName;
    '@media (max-width: 900px)'?: StyleXClassName;
    '@media (min-width: 900px)'?: StyleXClassName;
    '@media (min-width: 900px) and (max-width: 1259px)'?: StyleXClassName;
    '@media (max-width: 1099px)'?: StyleXClassName;
    '@media (max-width: 1199px)'?: StyleXClassName;
    '@media (max-width: 1259px)'?: StyleXClassName;
    '@media (min-width: 1290px)'?: StyleXClassName;
    '@media (max-width: 420px)'?: StyleXClassName;
    '@media (max-width: 500px)'?: StyleXClassName;
    '@media (pointer: coarse)'?: StyleXClassName;
    '@media (-webkit-min-device-pixel-ratio: 0)'?: StyleXClassName;
    '@media print'?: StyleXClassName;
    // Media queries used for Oculus Web Design Systems (OCDS components).
    '@media (max-width: 767px)'?: StyleXClassName;
    '@media (min-width: 768px)'?: StyleXClassName;
    '@media (min-width: 768px) and (max-width: 1024px)'?: StyleXClassName;
    '@media (max-width: 1024px)'?: StyleXClassName;
    '@media (min-width: 1025px)'?: StyleXClassName;
    '@media (min-width: 1025px) and (max-width: 1920px)'?: StyleXClassName;
    '@media (max-width: 1920px)'?: StyleXClassName;
    '@media (min-width: 1921px)'?: StyleXClassName;
    // Media queries used for Intern Data Products
    '@media (min-width: 1500px)'?: StyleXClassName;
    '@media (min-width: 1800px)'?: StyleXClassName;
    '@media (min-width: 2250px)'?: StyleXClassName;
    // webkit styles used for Search in Safari
    '::-webkit-search-decoration'?: StyleXClassName;
    '::-webkit-search-cancel-button'?: StyleXClassName;
    '::-webkit-search-results-button'?: StyleXClassName;
    '::-webkit-search-results-decoration'?: StyleXClassName;
    // Media queries used for the logged out header
    '@media (min-width: 950px)'?: StyleXClassName;
    // Media queries used for bizweb
    '@media (min-width: 1440px)'?: StyleXClassName;
    '@media (min-width: 1920px)'?: StyleXClassName;
    // Media queries used for fbai
    '@media (min-width: 800px)'?: StyleXClassName;
    // Media queries used for messengerkidsdotcom
    '@media (max-width: 1024px) and (min-width: 501px)'?: StyleXClassName;
  }
>;
type StyleXSingleStyle = false | (NestedCSSPropTypes | null | undefined);
type XStyle<T = NestedCSSPropTypes> = StyleXArray<
  false | (T | null | undefined)
>;
type XStyleWithout<T extends Record<string, void>> = XStyle<
  $ReadOnly<$Diff<NestedCSSPropTypes, T>>
>;
type Styles = $ReadOnly<Record<string, Style>>;
type Style = $ReadOnly<
  CSSProperties & {
    [pseudo: string]: CSSProperties;
  }
>;
type Rules = Style | CSSProperties;
type Keyframes = $ReadOnly<Record<string, CSSProperties>>;
type Theme = $ReadOnly<Record<string, string>>;
// type CSSValue = string | number | $ReadOnlyArray<mixed>;
type MapCSSValueToClassName = <K, V>(
  arg0: K,
  arg1: V,
) => StyleXClassNameFor<K, V>;
// NOTE: Flow was confused by nested ObjMap so for now, nested styles
// are typed incorrectly to be a string. This won't matter for the time being.
// type MapStyleToClassName = (<Rule: {}>(
//   Rule,
// ) => $ObjMap<Rule, MapCSSValueToClassName>) &
//   MapCSSValueToClassName;
type MapNamespaces = <CSS extends {}>(
  arg0: CSS,
) => $ObjMap<CSS, MapCSSValueToClassName>;

type DedupeStyles = $ReadOnly<
  Record<string, string | $ReadOnly<Record<string, string>>>
>;

type Stylex$Create = <S extends {}>(
  styles: S,
) => $ReadOnly<$ObjMap<S, MapNamespaces>>;

type AbsoluteFill = $ReadOnly<{
  bottom: 0;
  boxSizing: 'border-box';
  end: 0;
  position: 'absolute';
  start: 0;
  top: 0;
}>;

type AbsoluteCenter = $ReadOnly<{
  boxSizing: 'border-box';
  left: '50%';
  position: 'absolute';
  top: '50%';
  transform: 'translate(-50%, -50%)';
}>;

type BlockBase = $ReadOnly<{
  borderStyle: 'solid';
  borderWidth: 0;
  boxSizing: 'border-box';
  display: 'block';
  flexGrow: 1;
  flexShrink: 1;
  margin: 0;
  padding: 0;
  position: 'relative';
  zIndex: 0;
}>;

type InlineBase = $ReadOnly<
  BlockBase & {
    display: 'inline';
  }
>;

type ListBase = $ReadOnly<{
  boxSizing: 'border-box';
  listStyle: 'none';
  marginBottom: 0;
  marginTop: 0;
  paddingStart: 0;
}>;

type VisuallyHidden = $ReadOnly<{
  clip: 'rect(0, 0, 0, 0)';
  clipPath: 'inset(50%)';
  height: 1;
  overflow: 'hidden';
  position: 'absolute';
  width: 1;
}>;

type LinkBase = $ReadOnly<{
  backgroundColor: 'transparent';
  backgroundImage: 'none';
  boxSizing: 'border-box';
  color: 'inherit';
  cursor: 'pointer';
  position: 'relative';
  textDecoration: 'none';
  zIndex: 0;
}>;

type ButtonBase = $ReadOnly<{
  appearance: 'none';
  backgroundColor: 'transparent';
  borderStyle: 'solid';
  borderWidth: 0;
  boxSizing: 'border-box';
  margin: 0;
  padding: 0;
  position: 'relative';
  textAlign: 'inherit';
  zIndex: 0;
}>;

type FlexBase = $ReadOnly<{
  alignItems: 'stretch';
  borderStyle: 'solid';
  borderWidth: 0;
  boxSizing: 'border-box';
  display: 'flex';
  flexDirection: 'column';
  flexGrow: 1;
  flexShrink: 1;
  justifyContent: 'space-between';
  margin: 0;
  minHeight: 0;
  minWidth: 0;
  padding: 0;
  position: 'relative';
  zIndex: 0;
}>;

type FlexInlineBase = $ReadOnly<
  FlexBase & {
    display: 'inline-flex';
  }
>;

type SheetOptions = $ReadOnly<{
  rootDarkTheme?: Theme;
  rootTheme: Theme | null | undefined;
  supportsVariables?: boolean;
}>;

type stylex = {
  (
    ...styles: ReadonlyArray<
      StyleXArray<(DedupeStyles | null | undefined) | boolean>
    >
  ): string;
  visuallyHidden: VisuallyHidden;
  absoluteCenter: AbsoluteCenter;
  absoluteFill: AbsoluteFill;
  blockBase: BlockBase;
  buttonBase: ButtonBase;
  compose: (
    ...styles: ReadonlyArray<
      StyleXArray<(NestedCSSPropTypes | null | undefined) | boolean>
    >
  ) => NestedCSSPropTypes;
  create: Stylex$Create;
  dedupe: (...styles: ReadonlyArray<DedupeStyles>) => string;
  flexBase: FlexBase;
  flexInlineBase: FlexInlineBase;
  inject: (
    ltrRule: string,
    priority: number,
    rtlRule: string | null | undefined,
  ) => void;
  inlineBase: InlineBase;
  keyframes: (keyframes: Keyframes) => string;
  linkBase: LinkBase;
  listBase: ListBase;
};
