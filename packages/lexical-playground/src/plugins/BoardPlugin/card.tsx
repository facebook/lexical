/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import React, {useState} from 'react';

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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    updateCardContent(cardId, editedContent);
  };

  return (
    <div
      key={cardId}
      draggable={!isEditing}
      onDragStart={(e) => handleDragStart(e, cardId, columnId)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`${
        isCardDragging ? 'BoardPlugin__cardDragging' : ''
      } BoardPlugin__card`}>
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
        />
      ) : (
        <div>{content}</div>
      )}
      {isHovered && !isEditing && (
        <div className="BoardPlugin__cardButtons">
          <button onClick={() => deleteCard(cardId)}>🗑️</button>
          <button onClick={handleEdit}>✏️</button>
        </div>
      )}
    </div>
  );
}
