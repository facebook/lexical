/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './board.css';

import React, {useState} from 'react';

import Card from './card';
import Column from './column';
import Modal from './modal';

export interface Card {
  id: string;
  content: string;
}

export interface Column {
  id: string;
  title: string;
  cards: Card[];
}

const Board: React.FC = () => {
  const [columns, setColumns] = useState<Column[]>([
    {cards: [], id: 'todo', title: 'To Do'},
    {cards: [], id: 'ongoing', title: 'Ongoing'},
    {cards: [], id: 'done', title: 'Done'},
  ]);
  const [isCardDragging, setIsCardDragging] = useState<string | null>(null);
  const [draggedCard, setDraggedCard] = useState<{
    cardId: string;
    sourceColumnId: string;
  } | null>(null);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [modalPosition, setModalPosition] = useState<
    | {
        top: number;
        left: number;
      }
    | undefined
  >(undefined);

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    cardId: string,
    columnId: string,
  ) => {
    setIsCardDragging(cardId);
    setDraggedCard({cardId, sourceColumnId: columnId});
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    setIsCardDragging(null);
    e.preventDefault();
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetColumnId: string,
  ) => {
    e.preventDefault();

    if (!draggedCard) {
      return;
    }

    setColumns((prevColumns) => {
      const newColumns = prevColumns.map((column) => {
        if (column.id === draggedCard.sourceColumnId) {
          return {
            ...column,
            cards: column.cards.filter(
              (card) => card.id !== draggedCard.cardId,
            ),
          };
        }
        if (column.id === targetColumnId) {
          const cardToMove = prevColumns
            .find((col) => col.id === draggedCard.sourceColumnId)
            ?.cards.find((card) => card.id === draggedCard.cardId);

          return cardToMove
            ? {...column, cards: [...column.cards, cardToMove]}
            : column;
        }
        return column;
      });
      return newColumns;
    });

    setDraggedCard(null);
  };

  const addCard = (columnId: string, content: string) => {
    const newCard: Card = {
      content,
      id: Math.random().toString(36).substr(2, 9),
    };

    setColumns((prevColumns) =>
      prevColumns.map((col) =>
        col.id === columnId ? {...col, cards: [...col.cards, newCard]} : col,
      ),
    );
  };

  const addColumn = (title: string) => {
    const newColumn: Column = {
      cards: [],
      id: Math.random().toString(36).substr(2, 9),
      title,
    };

    setColumns((prevColumns) => [...prevColumns, newColumn]);
  };

  const openColumnModal = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setModalPosition({left: rect.left, top: rect.bottom});
    setIsColumnModalOpen(true);
  };

  const openCardModal = (e: React.MouseEvent, columnId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setModalPosition({left: rect.left, top: rect.bottom});
    setActiveColumnId(columnId);
    setIsCardModalOpen(true);
  };

  return (
    <div className="Board__container">
      <h1 className="Board__title">Kanban Board</h1>
      <div className="Board__columnContainer">
        {columns.map((column) => (
          <Column
            columnId={column.id}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            title={column.title}
            cards={column.cards}
            handleDragStart={handleDragStart}
            openCardModal={openCardModal}
            isCardDragging={isCardDragging}
          />
        ))}
        <div className="Board__newColumnButtonContainer">
          <button
            onClick={openColumnModal}
            className="Board__newColumnButton"
            title="Add new column">
            New
          </button>
        </div>
      </div>
      <Modal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        onSubmit={addColumn}
        title="Add New Column"
        position={modalPosition}
      />
      <Modal
        isOpen={isCardModalOpen}
        onClose={() => {
          setIsCardModalOpen(false);
          setActiveColumnId(null);
        }}
        onSubmit={(content) => {
          if (activeColumnId) {
            addCard(activeColumnId, content);
          }
        }}
        title="Add New Card"
        position={modalPosition}
      />
    </div>
  );
};

export default Board;
