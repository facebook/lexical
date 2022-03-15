/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 * @flow strict
 */

import type {LexicalEditor, LexicalNode} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $createTextNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  TextNode,
} from 'lexical';
import {useEffect} from 'react';

import {
  $createKeywordNode,
  $isKeywordNode,
  KeywordNode,
} from '../nodes/KeywordNode';

const keywordsRegex =
  /(^|$|[^A-Za-zªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԧԱ-Ֆՙա-ևא-תװ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࢠࢢ-ࢬऄ-हऽॐक़-ॡॱ-ॷॹ-ॿঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-ళవ-హఽౘౙౠౡಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೞೠೡೱೲഅ-ഌഎ-ഐഒ-ഺഽൎൠൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᜀ-ᜌᜎ-ᜑᜠ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡷᢀ-ᢨᢪᢰ-ᣵᤀ-ᤜᥐ-ᥭᥰ-ᥴᦀ-ᦫᧁ-ᧇᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭋᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᳩ-ᳬᳮ-ᳱᳵᳶᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎↃↄⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⸯ々〆〱-〵〻〼ぁ-ゖゝ-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿌ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚗꚠ-ꛥꜗ-ꜟꜢ-ꞈꞋ-ꞎꞐ-ꞓꞠ-Ɦꟸ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꪀ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꯀ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ])(congrats|congratulations|gratuluju|gratuluji|gratulujeme|blahopřeju|blahopřeji|blahopřejeme|Til lykke|Tillykke|Glückwunsch|Gratuliere|felicitaciones|enhorabuena|paljon onnea|onnittelut|Félicitations|gratula|gratulálok|gratulálunk|congratulazioni|complimenti|おめでとう|おめでとうございます|축하해|축하해요|gratulerer|Gefeliciteerd|gratulacje|Parabéns|parabéns|felicitações|felicitări|мои поздравления|поздравляем|поздравляю|gratulujem|blahoželám|ยินดีด้วย|ขอแสดงความยินดี|tebrikler|tebrik ederim|恭喜|祝贺你|恭喜你|恭喜|恭喜|baie geluk|veels geluk|অভিনন্দন|Čestitam|Čestitke|Čestitamo|Συγχαρητήρια|Μπράβο|અભિનંદન|badhai|बधाई|अभिनंदन|Честитам|Свака част|hongera|வாழ்த்துகள்|வாழ்த்துக்கள்|అభినందనలు|അഭിനന്ദനങ്ങൾ|Chúc mừng|מזל טוב|mazel tov|mazal tov)(^|$|[^A-Za-zªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԧԱ-Ֆՙա-ևא-תװ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࢠࢢ-ࢬऄ-हऽॐक़-ॡॱ-ॷॹ-ॿঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-ళవ-హఽౘౙౠౡಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೞೠೡೱೲഅ-ഌഎ-ഐഒ-ഺഽൎൠൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄງຈຊຍດ-ທນ-ຟມ-ຣລວສຫອ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏼᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᜀ-ᜌᜎ-ᜑᜠ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡷᢀ-ᢨᢪᢰ-ᣵᤀ-ᤜᥐ-ᥭᥰ-ᥴᦀ-ᦫᧁ-ᧇᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭋᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᳩ-ᳬᳮ-ᳱᳵᳶᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎↃↄⰀ-Ⱞⰰ-ⱞⱠ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⸯ々〆〱-〵〻〼ぁ-ゖゝ-ゟァ-ヺー-ヿㄅ-ㄭㄱ-ㆎㆠ-ㆺㇰ-ㇿ㐀-䶵一-鿌ꀀ-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚗꚠ-ꛥꜗ-ꜟꜢ-ꞈꞋ-ꞎꞐ-ꞓꞠ-Ɦꟸ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꪀ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꯀ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ])/i;

type LinkMatcherResult = {
  index: number,
  length: number,
  prefix: string,
  suffix: string,
  text: string,
};

function findFirstMatch(text: string): LinkMatcherResult | null {
  const match = keywordsRegex.exec(text);
  return (
    (match && {
      index: match.index,
      length: match[2].length,
      prefix: match[1],
      suffix: match[3],
      text: match[2],
    }) ??
    null
  );
}

function isPreviousNodeValid(node: LexicalNode): boolean {
  const previousNode = node.getPreviousSibling();
  return (
    previousNode === null ||
    $isLineBreakNode(previousNode) ||
    ($isTextNode(previousNode) && previousNode.getTextContent().endsWith(' '))
  );
}

function isNextNodeValid(node: LexicalNode): boolean {
  const nextNode = node.getNextSibling();
  return (
    nextNode === null ||
    $isLineBreakNode(nextNode) ||
    ($isTextNode(nextNode) && nextNode.getTextContent().startsWith(' '))
  );
}

function $plainTextTransform(node: TextNode): void {
  if (node.isSimpleText()) {
    convertPlainTextToKeyword(node);
  }
  convertNeighbordKeywordsToPlainText(node);
}

function convertPlainTextToKeyword(node: TextNode): void {
  // Only allow keywords in paragraphs
  if (!$isParagraphNode(node.getParentOrThrow())) {
    return;
  }
  const nodeText = node.getTextContent();

  // Check for the next sibling
  // Convert it if necessary
  const nextSibling = node.getNextSibling();
  if (
    nextSibling != null &&
    nodeText.endsWith(' ') &&
    $isTextNode(nextSibling) &&
    nextSibling.isSimpleText()
  ) {
    const nextSiblingText = nextSibling.getTextContent();
    let match;

    if ((match = findFirstMatch(nextSiblingText)) && match !== null) {
      const suffix = match.suffix;
      if ((suffix === '' || suffix === ' ') && isNextNodeValid(nextSibling)) {
        const startOffset = match.index + match.prefix.length;
        const keywordPlainTextNode = nextSibling.splitText(
          startOffset,
          startOffset + match.length,
        )[startOffset === 0 ? 0 : 1];
        const keywordNodeText = keywordPlainTextNode.getTextContent();
        const nextSiblingKeywordNode = $createKeywordNode(keywordNodeText);
        keywordPlainTextNode.replace(nextSiblingKeywordNode);
      }
    }
  }

  // Check for the previous sibling
  // Convert it if necessary
  const previousSibling = node.getPreviousSibling();
  if (
    previousSibling != null &&
    nodeText.startsWith(' ') &&
    $isTextNode(previousSibling) &&
    previousSibling.isSimpleText()
  ) {
    const previousSiblingText = previousSibling.getTextContent();
    let match;

    if ((match = findFirstMatch(previousSiblingText)) && match !== null) {
      const matchText = match.text;

      if (
        matchText === previousSiblingText &&
        isPreviousNodeValid(previousSibling)
      ) {
        const previousSiblingKeywordNode =
          $createKeywordNode(previousSiblingText);
        previousSibling.replace(previousSiblingKeywordNode);
      }
    }
  }

  const nodeTextLength = nodeText.length;
  let text = nodeText;
  let textOffset = 0;
  let lastNode = node;
  let lastNodeOffset = 0;
  let match;
  let middleNode;
  while ((match = findFirstMatch(text)) && match !== null) {
    const matchOffset = match.index;
    const offset = textOffset + matchOffset + match.prefix.length;
    const matchLength = match.length;
    // Previous node is valid if any of:
    // 1. Space before same node
    // 2. Space in previous simple text node
    // 3. Previous node is LineBreakNode
    let contentBeforeMatchIsValid;
    if (offset > 0) {
      contentBeforeMatchIsValid = nodeText[offset - 1] === ' ';
    } else {
      contentBeforeMatchIsValid = isPreviousNodeValid(node);
    }
    // Next node is valid if any of:
    // 1. Space after same node
    // 2. Space in next simple text node
    // 3. Next node is LineBreakNode
    let contentAfterMatchIsValid;
    if (offset + matchLength < nodeTextLength) {
      contentAfterMatchIsValid = nodeText[offset + matchLength] === ' ';
    } else {
      contentAfterMatchIsValid = isNextNodeValid(node);
    }
    if (contentBeforeMatchIsValid && contentAfterMatchIsValid) {
      middleNode = undefined;
      const lastNodeMatchOffset = offset - lastNodeOffset;

      if (lastNodeMatchOffset === 0) {
        [middleNode, lastNode] = lastNode.splitText(matchLength);
      } else {
        [, middleNode, lastNode] = lastNode.splitText(
          lastNodeMatchOffset,
          lastNodeMatchOffset + matchLength,
        );
      }
      const keywordNode = $createKeywordNode(match.text);
      middleNode.replace(keywordNode);
      lastNodeOffset = lastNodeMatchOffset + matchLength;
    }

    const iterationOffset = matchOffset + matchLength;
    text = text.substring(iterationOffset);
    textOffset += iterationOffset;
  }
}

function $keywordToPlainTextTransform(keywordNode: KeywordNode): void {
  // Check text content fully matches
  const text = keywordNode.getTextContent();
  const match = findFirstMatch(text);
  if (match === null || match.text !== text) {
    $convertKeywordNodeToPlainTextNode(keywordNode);
    return;
  }

  // Check neighbors
  if (!isPreviousNodeValid(keywordNode) || !isNextNodeValid(keywordNode)) {
    $convertKeywordNodeToPlainTextNode(keywordNode);
    return;
  }
}

// Bad neighbours are edits in neighbor nodes that make keywords incompatible.
// Given the creation preconditions, these can only be simple text nodes.
function convertNeighbordKeywordsToPlainText(textNode: TextNode): void {
  const previousSibling = textNode.getPreviousSibling();
  const nextSibling = textNode.getNextSibling();
  const text = textNode.getTextContent();
  if ($isKeywordNode(previousSibling) && !text.startsWith(' ')) {
    $convertKeywordNodeToPlainTextNode(previousSibling);
  }
  if ($isKeywordNode(nextSibling) && !text.endsWith(' ')) {
    $convertKeywordNodeToPlainTextNode(nextSibling);
  }
}

function useKeywords(editor: LexicalEditor): void {
  useEffect(() => {
    if (!editor.hasNodes([KeywordNode])) {
      throw new Error('KeywordsPlugin: KeywordNode not registered on editor');
    }

    const removePlainTextTransform = editor.addNodeTransform(
      TextNode,
      $plainTextTransform,
    );
    const removeKeywordToPlainTextTransform = editor.addNodeTransform(
      KeywordNode,
      $keywordToPlainTextTransform,
    );

    return () => {
      removePlainTextTransform();
      removeKeywordToPlainTextTransform();
    };
  }, [editor]);
}

function $convertKeywordNodeToPlainTextNode(node: KeywordNode): void {
  const textNode = $createTextNode(node.getTextContent());
  node.replace(textNode);
}

export default function KeywordsPlugin(): React$Node {
  const [editor] = useLexicalComposerContext();
  useKeywords(editor);
  return null;
}
