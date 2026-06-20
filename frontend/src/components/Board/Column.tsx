import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import TaskCard from './TaskCard';
import { Card as ColumnType, Task } from '../../types';

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  onAddTask: (columnId: string, title: string) => void;
  onTaskClick: (task: Task) => void;
}

const Column: React.FC<ColumnProps> = ({ column, tasks, onAddTask, onTaskClick }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const { setNodeRef } = useDroppable({ id: column.id });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    onAddTask(column.id, taskTitle);
    setTaskTitle('');
    setIsAdding(false);
  };

  return (
    <div className="flex-shrink-0 w-72 bg-gray-100 rounded-lg flex flex-col max-h-full">
      <div className="p-3 flex justify-between items-center">
        <h3 className="font-bold text-gray-700">{column.name}</h3>
        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">{tasks.length}</span>
      </div>

      <div ref={setNodeRef} className="flex-1 overflow-y-auto px-3 pb-3">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>

        {isAdding ? (
          <form onSubmit={handleAdd} className="mt-2">
            <textarea
              className="w-full p-2 text-sm border border-blue-400 rounded focus:outline-none"
              placeholder="Enter task title..."
              rows={2}
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 mt-1">
              <button
                type="submit"
                className="bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-gray-500 text-xs hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full text-left p-2 text-gray-500 text-sm hover:bg-gray-200 rounded mt-2 transition duration-200"
          >
            + Add a card
          </button>
        )}
      </div>
    </div>
  );
};

export default Column;
