import {useEffect} from 'react';

const baseEmojiStyle =
  "background-size: 16px 16px;" +
  "height: 16px;" +
  "width: 16px;" +
  "background-position: center;" +
  "background-repeat: no-repeat;" +
  "display: inline-block;" +
  "margin: 0 1px;" +
  "text-align: center;" +
  "vertical-align: middle;";

const happySmile =
  baseEmojiStyle +
  "background-image: url(https://static.xx.fbcdn.net/images/emoji.php/v9/t4c/1/16/1f642.png);";
const veryHappySmile =
  baseEmojiStyle +
  "background-image: url(https://static.xx.fbcdn.net/images/emoji.php/v9/t51/1/16/1f603.png);";
const unhappySmile =
  baseEmojiStyle +
  "background-image: url(https://static.xx.fbcdn.net/images/emoji.php/v9/tcb/1/16/1f641.png);";
  const heart =
  baseEmojiStyle +
  "background-image: url(https://static.xx.fbcdn.net/images/emoji.php/v9/t6c/1/16/2764.png);";

const specialSpace = "　";

const emojis = {
  ":)": happySmile,
  ":D": veryHappySmile,
  ":(": unhappySmile,
  "<3": heart,
};

function textNodeTransform(node, view) {
  const text = node.getTextContent();
  for (let i = 0; i < text.length; i++) {
    const possibleEmoji = text.slice(i, i + 2);
    const emojiStyle = emojis[possibleEmoji];

    if (emojiStyle !== undefined) {
      let targetNode;
      if (i === 0) {
        [targetNode] = node.splitText(i + 2);
      } else {
        [, targetNode] = node.splitText(i, i + 2);
      }
      const emojiInline = view
        .createText(specialSpace)
        .setStyle(emojiStyle)
        .makeImmutable()

      targetNode.replace(emojiInline);
      emojiInline.select();
      emojiInline.getParent().normalizeTextNodes(true);
      break;
    }
  }
}

export function useEmojiPlugin(outlineEditor) {
  useEffect(() => {
    if (outlineEditor !== null) {
      return outlineEditor.addTextTransform(textNodeTransform)
    }
  }, [outlineEditor])
}