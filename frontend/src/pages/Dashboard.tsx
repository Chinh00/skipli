import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Board } from '../types';

const Dashboard: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [newBoardName, setNewBoardName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const response = await api.get<Board[]>('/boards');
        setBoards(response.data);
      } catch (error) {
        console.error('Error fetching boards:', error);
      }
    };
    fetchBoards();
  }, []);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;

    try {
      const response = await api.post<Board>('/boards', { name: newBoardName });
      setBoards([...boards, response.data]);
      setNewBoardName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating board:', error);
    }
  };


  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Your Boards</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
        >
          + Create New Board
        </button>
      </div>

      {isCreating && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-md border border-gray-200">
          <form onSubmit={handleCreateBoard} className="flex gap-4">
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Enter board name..."
              className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {boards.map((board) => (
          <div
            key={board.id}
            onClick={() => navigate(`/board/${board.id}`)}
            className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-400 cursor-pointer transition duration-200"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{board.name}</h3>
            <p className="text-gray-500 text-sm">Owner: {board.ownerId}</p>
          </div>
        ))}
        {boards.length === 0 && !isCreating && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No boards found. Create your first board to get started!
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
