/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './board.css';

import {Card as CardType} from './board';
import Card from './card';

interface ColumnProps {
  columnId: string;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (
    e: React.DragEvent<HTMLDivElement>,
    targetColumnId: string,
  ) => void;
  title: string;
  cards: CardType[];
  handleDragStart: (
    e: React.DragEvent<HTMLDivElement>,
    cardId: string,
    columnId: string,
  ) => void;
  openCardModal: (e: React.MouseEvent, columnId: string) => void;
  isCardDragging: string | null;
}

export default function Column(props: ColumnProps) {
  const {
    columnId,
    handleDragOver,
    handleDrop,
    title,
    cards,
    handleDragStart,
    openCardModal,
    isCardDragging,
  } = props;
  return (
    <>
      <div
        key={columnId}
        className="BoardPlugin__columnContainer"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, columnId)}>
        <h2 className="BoardPlugin__columnTitle">{title}</h2>
        <div>
          {cards.map((card) => (
            <Card
              cardId={card.id}
              columnId={columnId}
              content={card.content}
              handleDragStart={handleDragStart}
              isCardDragging={isCardDragging}
            />
          ))}
        </div>
        <button
          onClick={(e) => openCardModal(e, columnId)}
          className="BoardPlugin__columnAddCardButton">
          Add Card
        </button>
      </div>
    </>
  );
}
