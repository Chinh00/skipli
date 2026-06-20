import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import api from '../services/api';
import useSocket from '../hooks/useSocket';
import Column from '../components/Board/Column';
import TaskCard from '../components/Board/TaskCard';
import TaskModal from '../components/Board/TaskModal';
import { Board as BoardType, Card as ColumnType, Task } from '../types';

const Board: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<BoardType | null>(null);
  const [columns, setColumns] = useState<ColumnType[]>([]);
  const [tasks, setTasks] = useState<{ [key: string]: Task[] }>({});
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskCardId, setSelectedTaskCardId] = useState<string | null>(null);
  
  const socket = useSocket(boardId!);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchData = useCallback(async () => {
    if (!boardId) return;
    try {
      // 1. Fetch Board
      const boardRes = await api.get<BoardType[]>(`/boards`);
      const currentBoard = boardRes.data.find(b => b.id === boardId);
      if (currentBoard) {
        setBoard(currentBoard);
      }

      // 2. Fetch Cards
      const cardsRes = await api.get<ColumnType[]>(`/boards/${boardId}/cards`);
      const sortedCards = cardsRes.data.sort((a, b) => a.order - b.order);
      setColumns(sortedCards);

      // 3. Fetch Tasks for each card
      const tasksData: { [key: string]: Task[] } = {};
      for (const card of sortedCards) {
        const tasksRes = await api.get<Task[]>(`/boards/${boardId}/cards/${card.id}/tasks`);
        tasksData[card.id] = tasksRes.data.sort((a, b) => a.order - b.order);
      }
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching board data:', error);
    }
  }, [boardId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!socket) return;

    socket.on('task-created', (task: Task) => {
      setTasks(prev => ({
        ...prev,
        [task.cardId]: [...(prev[task.cardId] || []), task].sort((a, b) => a.order - b.order)
      }));
    });

    socket.on('task-updated', () => {
      fetchData(); // Simplest way to handle moves between columns for now
    });

    socket.on('task-deleted', () => {
      fetchData();
    });

    return () => {
      socket.off('task-created');
      socket.off('task-updated');
      socket.off('task-deleted');
    };
  }, [socket, fetchData]);

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim() || !boardId) return;
    try {
      const response = await api.post<ColumnType>(`/boards/${boardId}/cards`, { name: newColumnName });
      setColumns([...columns, response.data]);
      setTasks(prev => ({ ...prev, [response.data.id]: [] }));
      setNewColumnName('');
      setIsAddingColumn(false);
    } catch (error) {
      console.error('Error adding column:', error);
    }
  };

  const handleAddTask = async (cardId: string, title: string) => {
    if (!boardId) return;
    try {
      await api.post(`/boards/${boardId}/cards/${cardId}/tasks`, { title, order: Date.now() });
      // State will be updated by Socket.io event
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const findColumnOfTask = (taskId: string) => {
    for (const cardId in tasks) {
      if (tasks[cardId].find(t => t.id === taskId)) return cardId;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskId = active.id as string;
    const cardId = findColumnOfTask(taskId);
    if (cardId) {
      const task = tasks[cardId].find(t => t.id === taskId);
      if (task) setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !boardId) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumnId = findColumnOfTask(activeId);
    let overColumnId = columns.find(c => c.id === overId) ? overId : findColumnOfTask(overId);

    if (!activeColumnId || !overColumnId) return;

    if (activeColumnId === overColumnId) {
      // Reorder within same column
      const columnTasks = tasks[activeColumnId];
      const oldIndex = columnTasks.findIndex(t => t.id === activeId);
      const newIndex = columnTasks.findIndex(t => t.id === overId);
      
      if (oldIndex !== newIndex) {
        const newTasks = arrayMove(columnTasks, oldIndex, newIndex);
        setTasks(prev => ({ ...prev, [activeColumnId]: newTasks }));
        // In a real app, we'd persist the new order here
        await api.put(`/boards/${boardId}/cards/${activeColumnId}/tasks/${activeId}`, {
          order: newTasks[newIndex].order // This is a simplification
        });
      }
    } else {
      // Move between columns
      try {
        await api.put(`/boards/${boardId}/cards/${activeColumnId}/tasks/${activeId}`, {
          cardId: overColumnId
        });
        // Local state will be updated by Socket.io or we could update it manually here
      } catch (error) {
        console.error('Error moving task:', error);
      }
    }
  };

  if (!board) return <div className="p-8">Loading board...</div>;

  return (
    <div className="h-[calc(100-4rem)] flex flex-col">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-800">{board.name}</h2>
      </div>

      <div className="flex-1 overflow-x-auto p-6 flex gap-6 items-start">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {columns.map(column => (
            <Column
              key={column.id}
              column={column}
              tasks={tasks[column.id] || []}
              onAddTask={handleAddTask}
              onTaskClick={(task) => {
                setSelectedTask(task);
                setSelectedTaskCardId(column.id);
              }}
            />
          ))}

          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} onClick={() => {}} /> : null}
          </DragOverlay>
        </DndContext>

        {isAddingColumn ? (
          <div className="flex-shrink-0 w-72 bg-gray-100 p-3 rounded-lg">
            <form onSubmit={handleAddColumn}>
              <input
                type="text"
                className="w-full p-2 border border-blue-400 rounded focus:outline-none mb-2"
                placeholder="Column name..."
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white text-xs font-bold py-2 px-4 rounded"
                >
                  Add Column
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingColumn(false)}
                  className="text-gray-500 text-sm hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingColumn(true)}
            className="flex-shrink-0 w-72 bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold py-3 px-4 rounded-lg transition duration-200 text-left"
          >
            + Add another column
          </button>
        )}
      </div>

      {selectedTask && boardId && selectedTaskCardId && (
          <TaskModal
            task={selectedTask}
            boardId={boardId}
            cardId={selectedTaskCardId}
            onClose={() => {
              setSelectedTask(null);
              setSelectedTaskCardId(null);
            }}
            onTaskUpdated={(updatedTask) => {
              setTasks(prev => ({
                ...prev,
                [selectedTaskCardId]: prev[selectedTaskCardId].map(t => 
                  t.id === updatedTask.id ? updatedTask : t
                )
              }));
              setSelectedTask(updatedTask);
            }}
          />
        )}
      </div>
    );
};

export default Board;
