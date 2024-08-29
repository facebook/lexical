/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useEffect, useRef} from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cardContent: string;
}

export default function Sidebar({isOpen, onClose, cardContent}: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div
      ref={sidebarRef}
      className={`fixed right-0 top-0 z-50 h-full w-80 transform bg-white shadow-lg transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
      <button
        onClick={onClose}
        className="m-4 rounded bg-red-500 p-2 hover:bg-red-500/90">
        <p className="text-sm font-semibold text-white">Close</p>
      </button>

      <div className="mx-4 rounded-full bg-yellow-200 px-4 py-2">
        <p className="text-xs font-semibold">Haven't put much efforts here </p>
      </div>

      <form className="m-4 p-2">
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="content" className="text-sm font-semibold">
              Title
            </label>
            <input
              id="content"
              name="content"
              placeholder="Enter task name..."
              value={cardContent}
              className="rounded-lg border px-1.5 py-2 text-sm "
            />
          </div>
        </div>
      </form>
    </div>
  );
}
