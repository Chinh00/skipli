import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Board from './pages/Board';
import GithubCallback from './pages/GithubCallback';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  const { isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    const returnTo = encodeURIComponent(`${window.location.origin}/login`);
    window.location.href = `https://github.com/logout?return_to=${returnTo}`;
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {isAuthenticated && (
          <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-blue-600 cursor-pointer" onClick={() => window.location.href = '/'}>
              Mini Trello
            </h1>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-4 rounded text-sm transition duration-200"
            >
              Logout
            </button>
          </nav>
        )}

        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/board/:boardId"
            element={
              <ProtectedRoute>
                <Board />
              </ProtectedRoute>
            }
          />
          <Route path="/github/callback" element={<GithubCallback />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
