/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './board.css';

import React, {useCallback, useEffect, useState} from 'react';

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
  const [boardTitle, setBoardTitle] = useState('');
  const [isEditing, setIsEditing] = useState(true);
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

  const updateCards = useCallback((columnId: string, updatedCards: Card[]) => {
    setColumns((prevColumns) =>
      prevColumns.map((column) =>
        column.id === columnId ? {...column, cards: updatedCards} : column,
      ),
    );
  }, []);

  const updateCardContent = useCallback(
    (cardId: string, editedContent: string) => {
      setColumns((prevColumns) =>
        prevColumns.map((column) => ({
          ...column,
          cards: column.cards.map((card) =>
            card.id === cardId ? {...card, content: editedContent} : card,
          ),
        })),
      );
    },
    [],
  );

  const updateColumnName = useCallback((columnId: string, newName: string) => {
    setColumns((prevColumns) =>
      prevColumns.map((column) =>
        column.id === columnId ? {...column, title: newName} : column,
      ),
    );
  }, []);

  const deleteColumn = useCallback(
    (columnId: string) => {
      if (columns.length === 1) {
        alert('you must have at least one column');
        return;
      }

      setColumns((prevColumns) =>
        prevColumns.filter((column) => column.id !== columnId),
      );
    },
    [columns],
  );

  useEffect(() => {
    const savedData = localStorage.getItem('boardData');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setBoardTitle(parsedData.boardTitle);
      setColumns(parsedData.columns);
    } else {
      setColumns([
        {cards: [], id: 'todo', title: 'To Do'},
        {cards: [], id: 'ongoing', title: 'Ongoing'},
        {cards: [], id: 'done', title: 'Done'},
      ]);
    }
  }, []);

  useEffect(() => {
    const dataToSave = {
      boardTitle,
      columns,
    };
    localStorage.setItem('boardData', JSON.stringify(dataToSave));
  }, [boardTitle, columns]);

  return (
    <div className="mx-auto flex flex-col overflow-x-scroll lg:w-8/12">
      <div className="flex w-full flex-col lg:flex-row lg:items-start lg:justify-between">
        {isEditing! ? (
          <input
            className="w-full bg-transparent px-2 py-1.5 text-lg font-bold outline-none transition duration-300 ease-in-out"
            type="text"
            placeholder="Board name"
            autoFocus={true}
            value={boardTitle || ''}
            onChange={(e) => setBoardTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsEditing(false);
                setBoardTitle(e.currentTarget.value || 'Untitled board');
              } else if (e.key === 'Escape') {
                setIsEditing(false);
                setBoardTitle('Untitled board');
              }
            }}
            onBlur={() => {
              setIsEditing(false);
              setBoardTitle(boardTitle || 'Untitled board');
            }}
          />
        ) : (
          <h3
            className="rounded-lg px-2 py-1.5 text-lg font-bold hover:bg-neutral-100"
            onClick={() => setIsEditing(true)}>
            {boardTitle || 'Untitled board'}
          </h3>
        )}
        <div className="m-0.5 flex flex-shrink-0 items-center border-none p-0.5 lg:justify-center">
          <button
            onClick={openColumnModal}
            className="rounded-lg border-none bg-neutral-200 px-2 py-1.5 transition-all duration-300 ease-in-out hover:bg-neutral-200 lg:bg-transparent"
            title="Add new column">
            <p className="text-sm font-semibold capitalize">New column</p>
          </button>
        </div>
      </div>
      <div className="relative mx-auto my-0 flex flex-1">
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
            updateCards={updateCards}
            updateCardContent={updateCardContent}
            updateColumnName={updateColumnName}
            deleteColumn={deleteColumn}
          />
        ))}
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
