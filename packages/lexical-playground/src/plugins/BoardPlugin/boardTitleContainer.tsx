/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

interface BoardTitleContainerProps {
  isEditing: boolean;
  boardTitle: string;
  setBoardTitle: React.Dispatch<React.SetStateAction<string>>;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  openColumnModal: (e: React.MouseEvent) => void;
}

const BoardTitleContainer: React.FC<BoardTitleContainerProps> = (props) => {
  const {isEditing, boardTitle, setBoardTitle, setIsEditing, openColumnModal} =
    props;

  return (
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
  );
};

export default BoardTitleContainer;
