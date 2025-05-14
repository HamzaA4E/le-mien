import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaTicketAlt, FaPlus, FaUserPlus, FaUser, FaUsers, FaSignOutAlt } from 'react-icons/fa';
import axios from 'axios';

// Configuration de la base URL pour axios
axios.defaults.baseURL = 'http://localhost:8000';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      await axios.post('/api/logout', {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      localStorage.removeItem('token');
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // En cas d'erreur, on supprime quand même le token et on redirige
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  const menuItems = [
    { path: '/dashboard', icon: <FaHome />, text: 'Tableau de bord' },
    { path: '/tickets', icon: <FaTicketAlt />, text: 'Tickets' },
    { path: '/create-ticket', icon: <FaPlus />, text: 'Créer un ticket' },
    { path: '/create-user', icon: <FaUserPlus />, text: 'Créer un utilisateur' },
    { path: '/users', icon: <FaUsers />, text: 'Liste des utilisateurs' },
    { path: '/profile', icon: <FaUser />, text: 'Mon Profil' },
  ];

  return (
    <div className="bg-gray-800 text-white w-64 min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Gestion Tickets</h1>
      </div>
      <nav className="flex-grow">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto pt-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-2 p-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        >
          <span className="text-lg"><FaSignOutAlt /></span>
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 