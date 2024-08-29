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
import {DeleteIcon, EditIcon} from './icons';

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
        className="mx-auto w-64 flex-shrink-0 p-2 "
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, columnId)}>
        <div
          className="flex items-center justify-between  p-2.5"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}>
          {isEditing ? (
            <input
              className="mb-0.5 border-b border-none border-slate-900 bg-transparent text-lg font-semibold outline-none"
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
            <h2 className="mb-0.5 text-lg font-semibold">{title}</h2>
          )}
          {isHovered && !isEditing && (
            <div className="space-x-2 transition-all duration-300 ease-in-out">
              <button
                className="rounded-md p-1 transition-all duration-300 ease-in-out hover:bg-neutral-200"
                onClick={handleEditTitle}>
                <EditIcon />
              </button>
              <button
                className="rounded-md p-1 transition-all duration-300 ease-in-out hover:bg-neutral-200"
                onClick={() => deleteColumn(columnId)}>
                <DeleteIcon />
              </button>
            </div>
          )}
        </div>

        <hr />
        <div className="my-3 space-y-2">
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
          className="mt-0.5 w-fit rounded-lg border-none bg-transparent px-2 py-1.5 outline-none transition-all duration-300 ease-in-out hover:bg-neutral-200">
          <p className="text-sm font-semibold capitalize">Add new card</p>
        </button>
      </div>
    </>
  );
}
