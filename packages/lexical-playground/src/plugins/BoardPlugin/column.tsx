/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './board.css';

import {useState} from 'react';

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
  updateCards: (columnId: string, updatedCards: CardType[]) => void;
  updateCardContent: (cardId: string, editedContent: string) => void;
  updateColumnName: (columnId: string, newName: string) => void;
  deleteColumn: (columnId: string) => void;
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
    updateColumnName,
    deleteColumn,
    updateCards,
    updateCardContent,
  } = props;

  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);

  const deleteCard = (cardId: string) => {
    const updatedCards = cards.filter((card) => card.id !== cardId);
    updateCards(columnId, updatedCards);
  };

  const handleEditTitle = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    updateColumnName(columnId, editedTitle);
    setIsEditing(false);
  };
  return (
    <>
      <div
        key={columnId}
        className="BoardPlugin__columnContainer"
        onDragOver={handleDragOver}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDrop={(e) => handleDrop(e, columnId)}>
        <div className="BoardPlugin__columnTitleContainer">
          {isEditing ? (
            <input
              className="BoardPlugin__columnTitleInput"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSave}
              autoFocus={true}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                } else if (e.key === 'Escape') {
                  setIsEditing(false);
                  setEditedTitle(title);
                }
              }}
            />
          ) : (
            <h2 className="BoardPlugin__columnTitle">{title}</h2>
          )}
          {isHovered && !isEditing && (
            <div className="BoardPlugin__columnButtons">
              <button onClick={handleEditTitle}>✏️</button>
              <button onClick={() => deleteColumn(columnId)}>🗑️</button>
            </div>
          )}
        </div>
        <div>
          {cards.map((card) => (
            <Card
              cardId={card.id}
              columnId={columnId}
              content={card.content}
              handleDragStart={handleDragStart}
              isCardDragging={isCardDragging}
              deleteCard={deleteCard}
              updateCardContent={updateCardContent}
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
