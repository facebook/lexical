/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

interface CardProps {
  cardId: string;
  columnId: string;
  content: string;
  isCardDragging: string | null;
  handleDragStart: (
    e: React.DragEvent<HTMLDivElement>,
    cardId: string,
    columnId: string,
  ) => void;
}

export default function Card(props: CardProps) {
  const {cardId, columnId, handleDragStart, isCardDragging, content} = props;

  return (
    <>
      <div
        key={cardId}
        contentEditable={false}
        draggable={true}
        onDragStart={(e) => handleDragStart(e, cardId, columnId)}
        className={`${
          isCardDragging ? 'BoardPlugin__cardDragging' : ''
        } BoardPlugin__card`}>
        {content}
      </div>
    </>
  );
}
