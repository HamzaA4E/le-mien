import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaTicketAlt, FaPlus, FaUserPlus, FaUser, FaUsers, FaSignOutAlt, FaCogs, FaRobot, FaClock, FaCheckCircle } from 'react-icons/fa';
import axios from 'axios';
import { useState } from 'react';

// Configuration de la base URL pour axios
axios.defaults.baseURL = 'http://localhost:8000';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Récupérer le user depuis le localStorage
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch (e) {
    user = null;
  }
  const niveau = user?.niveau;

  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    setLoading(true); // Activer l'animation de chargement
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
      localStorage.removeItem('user');
      navigate('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // En cas d'erreur, on supprime quand même le token et on redirige
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false); // Désactiver l'animation en cas d'erreur ou avant redirection
      navigate('/login'); // Assurer la redirection même en cas d'erreur
    }
  };

  // Menu par défaut (admin)
  let menuItems = [
    { path: '/dashboard', icon: <FaHome />, text: 'Tableau de bord' },
    { path: '/tickets', icon: <FaTicketAlt />, text: 'Tickets' },
    { path: '/admin/pending-tickets', icon: <FaClock />, text: 'Tickets en attente' },
    { path: '/admin/register-requests', icon: <FaUserPlus />, text: 'Demandes d\'inscription' },
    { path: '/create-user', icon: <FaUserPlus />, text: 'Créer un utilisateur' },
    { path: '/users', icon: <FaUsers />, text: 'Liste des utilisateurs' },
    { path: '/admin/entities', icon: <FaCogs />, text: 'Gestion des référentiels' },
    { path: '/profile', icon: <FaUser />, text: 'Mon Profil' },
  ];

  // Si directeur général (niveau 2), on limite le menu
  if (niveau === '2' || niveau === 2) {
    menuItems = [
      { path: '/dashboard', icon: <FaHome />, text: 'Tableau de bord' },
      { path: '/tickets', icon: <FaTicketAlt />, text: 'Tickets' },
      { path: '/profile', icon: <FaUser />, text: 'Mon Profil' },
    ];
  }
  // Si directeur département (niveau 3), on limite le menu
  else if (niveau === '3' || niveau === 3) {
    menuItems = [
      { path: '/dashboard', icon: <FaHome />, text: 'Tableau de bord' },
      { path: '/tickets', icon: <FaTicketAlt />, text: 'Tickets' },
      { path: '/create-ticket', icon: <FaRobot />, text: 'Créer un ticket (IA)' },
      { path: '/profile', icon: <FaUser />, text: 'Mon Profil' },
    ];
  }
  // Si demandeur (niveau 4), on limite encore plus le menu
  else if (niveau === '4' || niveau === 4) {
    menuItems = [
      { path: '/dashboard', icon: <FaHome />, text: 'Tableau de bord' },
      { path: '/create-ticket', icon: <FaRobot />, text: 'Créer un ticket (IA)' },
      { path: '/tickets', icon: <FaTicketAlt />, text: 'Mes Tickets' },
      { path: '/completed-tickets', icon: <FaCheckCircle />, text: 'Tickets terminés' },
      { path: '/profile', icon: <FaUser />, text: 'Mon Profil' },
    ];
  }

  return (
    <div className="bg-gray-800 text-white w-64 min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Gestion Tickets</h1>
      </div>
      <nav>
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
          <li>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 p-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white w-full"
              disabled={loading}
            >
              <span className="text-lg">
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.908l2-2.617zm10 0l2 2.617A7.962 7.962 0 0020 12h-4a8 8 0 01-2 5.291z"></path>
                  </svg>
                ) : (
                  <FaSignOutAlt />
                )}
              </span>
              <span>{loading ? 'Déconnexion...' : 'Déconnexion'}</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar; 