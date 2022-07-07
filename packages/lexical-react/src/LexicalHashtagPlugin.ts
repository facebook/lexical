/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {TextNode} from 'lexical';

import {$createHashtagNode, HashtagNode} from '@lexical/hashtag';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalTextEntity} from '@lexical/react/useLexicalTextEntity';
import {useCallback, useEffect} from 'react';

function getHashtagRegexStringChars(): Readonly<{
  alpha: string;
  alphanumeric: string;
  hashChars: string;
}> {
  // Latin accented characters
  // Excludes 0xd7 from the range
  // (the multiplication sign, confusable with "x").
  // Also excludes 0xf7, the division sign
  const latinAccents =
    '\xc0-\xd6' +
    '\xd8-\xf6' +
    '\xf8-\xff' +
    '\u0100-\u024f' +
    '\u0253-\u0254' +
    '\u0256-\u0257' +
    '\u0259' +
    '\u025b' +
    '\u0263' +
    '\u0268' +
    '\u026f' +
    '\u0272' +
    '\u0289' +
    '\u028b' +
    '\u02bb' +
    '\u0300-\u036f' +
    '\u1e00-\u1eff';

  // Cyrillic (Russian, Ukrainian, etc.)
  const nonLatinChars =
    '\u0400-\u04ff' + // Cyrillic
    '\u0500-\u0527' + // Cyrillic Supplement
    '\u2de0-\u2dff' + // Cyrillic Extended A
    '\ua640-\ua69f' + // Cyrillic Extended B
    '\u0591-\u05bf' + // Hebrew
    '\u05c1-\u05c2' +
    '\u05c4-\u05c5' +
    '\u05c7' +
    '\u05d0-\u05ea' +
    '\u05f0-\u05f4' +
    '\ufb12-\ufb28' + // Hebrew Presentation Forms
    '\ufb2a-\ufb36' +
    '\ufb38-\ufb3c' +
    '\ufb3e' +
    '\ufb40-\ufb41' +
    '\ufb43-\ufb44' +
    '\ufb46-\ufb4f' +
    '\u0610-\u061a' + // Arabic
    '\u0620-\u065f' +
    '\u066e-\u06d3' +
    '\u06d5-\u06dc' +
    '\u06de-\u06e8' +
    '\u06ea-\u06ef' +
    '\u06fa-\u06fc' +
    '\u06ff' +
    '\u0750-\u077f' + // Arabic Supplement
    '\u08a0' + // Arabic Extended A
    '\u08a2-\u08ac' +
    '\u08e4-\u08fe' +
    '\ufb50-\ufbb1' + // Arabic Pres. Forms A
    '\ufbd3-\ufd3d' +
    '\ufd50-\ufd8f' +
    '\ufd92-\ufdc7' +
    '\ufdf0-\ufdfb' +
    '\ufe70-\ufe74' + // Arabic Pres. Forms B
    '\ufe76-\ufefc' +
    '\u200c-\u200c' + // Zero-Width Non-Joiner
    '\u0e01-\u0e3a' + // Thai
    '\u0e40-\u0e4e' + // Hangul (Korean)
    '\u1100-\u11ff' + // Hangul Jamo
    '\u3130-\u3185' + // Hangul Compatibility Jamo
    '\uA960-\uA97F' + // Hangul Jamo Extended-A
    '\uAC00-\uD7AF' + // Hangul Syllables
    '\uD7B0-\uD7FF' + // Hangul Jamo Extended-B
    '\uFFA1-\uFFDC'; // Half-width Hangul

  const charCode = String.fromCharCode;

  const cjkChars =
    '\u30A1-\u30FA\u30FC-\u30FE' + // Katakana (full-width)
    '\uFF66-\uFF9F' + // Katakana (half-width)
    '\uFF10-\uFF19\uFF21-\uFF3A' +
    '\uFF41-\uFF5A' + // Latin (full-width)
    '\u3041-\u3096\u3099-\u309E' + // Hiragana
    '\u3400-\u4DBF' + // Kanji (CJK Extension A)
    '\u4E00-\u9FFF' + // Kanji (Unified)
    // Disabled as it breaks the Regex.
    // charCode(0x20000) + '-' + charCode(0x2A6DF) + // Kanji (CJK Extension B)
    charCode(0x2a700) +
    '-' +
    charCode(0x2b73f) + // Kanji (CJK Extension C)
    charCode(0x2b740) +
    '-' +
    charCode(0x2b81f) + // Kanji (CJK Extension D)
    charCode(0x2f800) +
    '-' +
    charCode(0x2fa1f) +
    '\u3003\u3005\u303B'; // Kanji (CJK supplement)

  const otherChars = latinAccents + nonLatinChars + cjkChars;
  // equivalent of \p{L}

  const unicodeLetters =
    '\u0041-\u005A\u0061-\u007A\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6' +
    '\u00F8-\u0241\u0250-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EE\u037A\u0386' +
    '\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03CE\u03D0-\u03F5\u03F7-\u0481' +
    '\u048A-\u04CE\u04D0-\u04F9\u0500-\u050F\u0531-\u0556\u0559\u0561-\u0587' +
    '\u05D0-\u05EA\u05F0-\u05F2\u0621-\u063A\u0640-\u064A\u066E-\u066F' +
    '\u0671-\u06D3\u06D5\u06E5-\u06E6\u06EE-\u06EF\u06FA-\u06FC\u06FF\u0710' +
    '\u0712-\u072F\u074D-\u076D\u0780-\u07A5\u07B1\u0904-\u0939\u093D\u0950' +
    '\u0958-\u0961\u097D\u0985-\u098C\u098F-\u0990\u0993-\u09A8\u09AA-\u09B0' +
    '\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC-\u09DD\u09DF-\u09E1\u09F0-\u09F1' +
    '\u0A05-\u0A0A\u0A0F-\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32-\u0A33' +
    '\u0A35-\u0A36\u0A38-\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D' +
    '\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2-\u0AB3\u0AB5-\u0AB9\u0ABD' +
    '\u0AD0\u0AE0-\u0AE1\u0B05-\u0B0C\u0B0F-\u0B10\u0B13-\u0B28\u0B2A-\u0B30' +
    '\u0B32-\u0B33\u0B35-\u0B39\u0B3D\u0B5C-\u0B5D\u0B5F-\u0B61\u0B71\u0B83' +
    '\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99-\u0B9A\u0B9C\u0B9E-\u0B9F' +
    '\u0BA3-\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0C05-\u0C0C\u0C0E-\u0C10' +
    '\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C60-\u0C61\u0C85-\u0C8C' +
    '\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE' +
    '\u0CE0-\u0CE1\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D28\u0D2A-\u0D39' +
    '\u0D60-\u0D61\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6' +
    '\u0E01-\u0E30\u0E32-\u0E33\u0E40-\u0E46\u0E81-\u0E82\u0E84\u0E87-\u0E88' +
    '\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7' +
    '\u0EAA-\u0EAB\u0EAD-\u0EB0\u0EB2-\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6' +
    '\u0EDC-\u0EDD\u0F00\u0F40-\u0F47\u0F49-\u0F6A\u0F88-\u0F8B\u1000-\u1021' +
    '\u1023-\u1027\u1029-\u102A\u1050-\u1055\u10A0-\u10C5\u10D0-\u10FA\u10FC' +
    '\u1100-\u1159\u115F-\u11A2\u11A8-\u11F9\u1200-\u1248\u124A-\u124D' +
    '\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0' +
    '\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310' +
    '\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C' +
    '\u166F-\u1676\u1681-\u169A\u16A0-\u16EA\u1700-\u170C\u170E-\u1711' +
    '\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7' +
    '\u17DC\u1820-\u1877\u1880-\u18A8\u1900-\u191C\u1950-\u196D\u1970-\u1974' +
    '\u1980-\u19A9\u19C1-\u19C7\u1A00-\u1A16\u1D00-\u1DBF\u1E00-\u1E9B' +
    '\u1EA0-\u1EF9\u1F00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D' +
    '\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC' +
    '\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC' +
    '\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u2094\u2102\u2107' +
    '\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D' +
    '\u212F-\u2131\u2133-\u2139\u213C-\u213F\u2145-\u2149\u2C00-\u2C2E' +
    '\u2C30-\u2C5E\u2C80-\u2CE4\u2D00-\u2D25\u2D30-\u2D65\u2D6F\u2D80-\u2D96' +
    '\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6' +
    '\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3006\u3031-\u3035' +
    '\u303B-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF' +
    '\u3105-\u312C\u3131-\u318E\u31A0-\u31B7\u31F0-\u31FF\u3400-\u4DB5' +
    '\u4E00-\u9FBB\uA000-\uA48C\uA800-\uA801\uA803-\uA805\uA807-\uA80A' +
    '\uA80C-\uA822\uAC00-\uD7A3\uF900-\uFA2D\uFA30-\uFA6A\uFA70-\uFAD9' +
    '\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C' +
    '\uFB3E\uFB40-\uFB41\uFB43-\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F' +
    '\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A' +
    '\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7' +
    '\uFFDA-\uFFDC';

  // equivalent of \p{Mn}\p{Mc}
  const unicodeAccents =
    '\u0300-\u036F\u0483-\u0486\u0591-\u05B9\u05BB-\u05BD\u05BF' +
    '\u05C1-\u05C2\u05C4-\u05C5\u05C7\u0610-\u0615\u064B-\u065E\u0670' +
    '\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\u0711\u0730-\u074A' +
    '\u07A6-\u07B0\u0901-\u0903\u093C\u093E-\u094D\u0951-\u0954\u0962-\u0963' +
    '\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7-\u09C8\u09CB-\u09CD\u09D7' +
    '\u09E2-\u09E3\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47-\u0A48\u0A4B-\u0A4D' +
    '\u0A70-\u0A71\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD' +
    '\u0AE2-\u0AE3\u0B01-\u0B03\u0B3C\u0B3E-\u0B43\u0B47-\u0B48\u0B4B-\u0B4D' +
    '\u0B56-\u0B57\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7' +
    '\u0C01-\u0C03\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55-\u0C56' +
    '\u0C82-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5-\u0CD6' +
    '\u0D02-\u0D03\u0D3E-\u0D43\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D82-\u0D83' +
    '\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2-\u0DF3\u0E31\u0E34-\u0E3A' +
    '\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB-\u0EBC\u0EC8-\u0ECD\u0F18-\u0F19' +
    '\u0F35\u0F37\u0F39\u0F3E-\u0F3F\u0F71-\u0F84\u0F86-\u0F87\u0F90-\u0F97' +
    '\u0F99-\u0FBC\u0FC6\u102C-\u1032\u1036-\u1039\u1056-\u1059\u135F' +
    '\u1712-\u1714\u1732-\u1734\u1752-\u1753\u1772-\u1773\u17B6-\u17D3\u17DD' +
    '\u180B-\u180D\u18A9\u1920-\u192B\u1930-\u193B\u19B0-\u19C0\u19C8-\u19C9' +
    '\u1A17-\u1A1B\u1DC0-\u1DC3\u20D0-\u20DC\u20E1\u20E5-\u20EB\u302A-\u302F' +
    '\u3099-\u309A\uA802\uA806\uA80B\uA823-\uA827\uFB1E\uFE00-\uFE0F' +
    '\uFE20-\uFE23';

  // equivalent of \p{Dn}
  const unicodeDigits =
    '\u0030-\u0039\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u09E6-\u09EF' +
    '\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F' +
    '\u0CE6-\u0CEF\u0D66-\u0D6F\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F29' +
    '\u1040-\u1049\u17E0-\u17E9\u1810-\u1819\u1946-\u194F\u19D0-\u19D9' +
    '\uFF10-\uFF19';

  // An alpha char is a unicode chars including unicode marks or
  // letter or char in otherChars range
  const alpha = unicodeLetters + unicodeAccents + otherChars;

  // A numeric character is any with the number digit property, or
  // underscore. These characters can be included in hashtags, but a hashtag
  // cannot have only these characters.
  const numeric = unicodeDigits + '_';

  // Alphanumeric char is any alpha char or a unicode char with decimal
  // number property \p{Nd}
  const alphanumeric = alpha + numeric;
  const hashChars = '#\\uFF03'; // normal '#' or full-width '#'

  return {
    alpha,
    alphanumeric,
    hashChars,
  };
}

function getHashtagRegexString(): string {
  const {alpha, alphanumeric, hashChars} = getHashtagRegexStringChars();

  const hashtagAlpha = '[' + alpha + ']';
  const hashtagAlphanumeric = '[' + alphanumeric + ']';
  const hashtagBoundary = '^|$|[^&/' + alphanumeric + ']';
  const hashCharList = '[' + hashChars + ']';

  // A hashtag contains characters, numbers and underscores,
  // but not all numbers.
  const hashtag =
    '(' +
    hashtagBoundary +
    ')(' +
    hashCharList +
    ')(' +
    hashtagAlphanumeric +
    '*' +
    hashtagAlpha +
    hashtagAlphanumeric +
    '*)';

  return hashtag;
}

const REGEX = new RegExp(getHashtagRegexString(), 'i');

export function HashtagPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([HashtagNode])) {
      throw new Error('HashtagPlugin: HashtagNode not registered on editor');
    }
  }, [editor]);

  const createHashtagNode = useCallback((textNode: TextNode): HashtagNode => {
    return $createHashtagNode(textNode.getTextContent());
  }, []);

  const getHashtagMatch = useCallback((text: string) => {
    const matchArr = REGEX.exec(text);

    if (matchArr === null) {
      return null;
    }

    const hashtagLength = matchArr[3].length + 1;
    const startOffset = matchArr.index + matchArr[1].length;
    const endOffset = startOffset + hashtagLength;
    return {
      end: endOffset,
      start: startOffset,
    };
  }, []);

  useLexicalTextEntity<HashtagNode>(
    getHashtagMatch,
    HashtagNode,
    createHashtagNode,
  );

  return null;
}
