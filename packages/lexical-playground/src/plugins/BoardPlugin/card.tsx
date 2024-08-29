/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import React, {useState} from 'react';

import {DeleteIcon, EditIcon} from './icons';
import Sidebar from './sidebar';

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
  deleteCard: (cardId: string) => void;
  updateCardContent: (cardId: string, editedContent: string) => void;
}

export default function Card(props: CardProps) {
  const {
    cardId,
    columnId,
    handleDragStart,
    isCardDragging,
    content,
    deleteCard,
    updateCardContent,
  } = props;
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleCardClick = () => {
    setIsSidebarOpen(true);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    updateCardContent(cardId, editedContent);
  };

  return (
    <>
      <div
        key={cardId}
        draggable={!isEditing}
        onDragStart={(e) => handleDragStart(e, cardId, columnId)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
        className={`${
          isCardDragging ? 'BoardPlugin__cardDragging' : ''
        } relative flex items-center justify-between rounded-lg bg-white p-1 shadow-md transition-shadow duration-300 ease-in-out hover:bg-neutral-100 hover:shadow-lg`}>
        {isEditing ? (
          <input
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            onBlur={handleSave}
            autoFocus={true}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave();
              } else if (e.key === 'Escape') {
                setIsEditing(false);
                setEditedContent(content);
              }
            }}
            className="w-full rounded-md border border-gray-300 bg-gray-100 p-2 pl-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          />
        ) : (
          <div className="p-2 pl-3 text-sm font-semibold text-gray-800">
            {content}
          </div>
        )}
        {isHovered && !isEditing && (
          <div className="space-x-2 transition-all duration-300 ease-in-out">
            <button
              title="Delete card"
              onClick={() => deleteCard(cardId)}
              className="rounded-md p-1 transition-all duration-300 ease-in-out hover:bg-neutral-200">
              <DeleteIcon />
            </button>
            <button
              title="Rename card"
              onClick={handleEdit}
              className="rounded-md p-1 transition-all duration-300 ease-in-out hover:bg-neutral-200">
              <EditIcon />
            </button>
          </div>
        )}
      </div>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        cardContent={content} // Pass card content to Sidebar
      />
    </>
  );
}
