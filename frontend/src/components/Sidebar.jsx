import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaHome, FaSignOutAlt, FaPlus, FaUserPlus } from 'react-icons/fa';
import axios from '../utils/axios';

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post('/api/logout');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  return (
    <div className="bg-gray-800 text-white w-64 min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Gestion Tickets</h1>
      </div>
      
      <nav className="space-y-2">
        <Link
          to="/dashboard"
          className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700 transition-colors"
        >
          <FaHome className="text-xl" />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/tickets/create"
          className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700 transition-colors"
        >
          <FaPlus className="text-xl" />
          <span>Nouveau Ticket</span>
        </Link>

        <Link
          to="/utilisateurs/create"
          className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700 transition-colors"
        >
          <FaUserPlus className="text-xl" />
          <span>Nouvel Utilisateur</span>
        </Link>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-2 p-2 rounded hover:bg-gray-700 transition-colors"
        >
          <FaSignOutAlt className="text-xl" />
          <span>Déconnexion</span>
        </button>
      </nav>
    </div>
  );
};

export default Sidebar; 