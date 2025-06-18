import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaTicketAlt, FaPlus, FaUserPlus, FaUser, FaUsers, FaSignOutAlt, FaCogs, FaRobot, FaClock, FaCheckCircle, FaChartBar, FaCheck, FaUserCheck } from 'react-icons/fa';
import axios from 'axios';
import { useCounters } from '../contexts/CountersContext';

// Configuration de la base URL pour axios
axios.defaults.baseURL = 'http://localhost:8000';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { counters } = useCounters();

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
    { path: '/create-ticket', icon: <FaPlus />, text: 'Créer un ticket ' },
    { 
      path: '/admin/pending-tickets', 
      icon: <FaClock />, 
      text: 'Tickets en attente',
      badge: counters.pendingTickets > 0 ? counters.pendingTickets : null
    },
    { 
      path: '/admin/validated-by-director',
      icon: <FaUserCheck />, 
      text: 'Tickets validés par directeur'
    },
    { 
      path: '/admin/register-requests', 
      icon: <FaUserPlus />, 
      text: 'Demandes d\'inscription',
      badge: counters.pendingRequests > 0 ? counters.pendingRequests : null
    },
    { path: '/create-user', icon: <FaUserPlus />, text: 'Créer un utilisateur' },
    { path: '/users', icon: <FaUsers />, text: 'Liste des utilisateurs' },
    { path: '/admin/entities', icon: <FaCogs />, text: 'Gestion des référentiels' },
    { path: '/reports', icon: <FaChartBar />, text: 'Rapports' },
    { path: '/profile', icon: <FaUser />, text: 'Mon Profil' },
  ];

  // Si directeur général (niveau 2), on limite le menu
  if (niveau === '2' || niveau === 2) {
    menuItems = [
      { path: '/dashboard', icon: <FaHome />, text: 'Tableau de bord' },
      { path: '/tickets', icon: <FaTicketAlt />, text: 'Tickets' },
      { 
        path: '/admin/pending-tickets', 
        icon: <FaClock />, 
        text: 'Tickets en attente',
        badge: counters.pendingTickets > 0 ? counters.pendingTickets : null
      },
      { path: '/reports', icon: <FaChartBar />, text: 'Rapports' },
      { path: '/profile', icon: <FaUser />, text: 'Mon Profil' },
    ];
  }
  // Si directeur département (niveau 3), on limite le menu
  else if (niveau === '3' || niveau === 3) {
    menuItems = [
      { path: '/dashboard', icon: <FaHome />, text: 'Tableau de bord' },
      { path: '/tickets', icon: <FaTicketAlt />, text: 'Tickets' },
      { 
        path: '/director-validation', 
        icon: <FaCheck />, 
        text: 'Validation des projets'
      },
      { 
        path: '/admin/pending-tickets', 
        icon: <FaClock />, 
        text: 'Tickets en attente',
        badge: counters.pendingTickets > 0 ? counters.pendingTickets : null
      },
     { path: '/create-ticket', icon: <FaPlus />, text: 'Créer un ticket ' },
      { path: '/reports', icon: <FaChartBar />, text: 'Rapports' },
      { path: '/profile', icon: <FaUser />, text: 'Mon Profil' },
    ];
  }
  // Si demandeur (niveau 4), on limite encore plus le menu
  else if (niveau === '4' || niveau === 4) {
    menuItems = [
      { path: '/dashboard', icon: <FaHome />, text: 'Tableau de bord' },
      { path: '/create-ticket', icon: <FaPlus />, text: 'Créer un ticket ' },
      { path: '/tickets', icon: <FaTicketAlt />, text: 'Mes Tickets' },
      { 
        path: '/completed-tickets', 
        icon: <FaCheckCircle />, 
        text: 'Tickets terminés',
        badge: counters.completedTickets > 0 ? counters.completedTickets : null
      },
      { path: '/profile', icon: <FaUser />, text: 'Mon Profil' },
    ];
  }
  // Si exécutant (niveau 5), menu spécifique
  else if (niveau === '5' || niveau === 5) {
    menuItems = [
      { path: '/dashboard', icon: <FaHome />, text: 'Tableau de bord' },
      { path: '/tickets', icon: <FaTicketAlt />, text: 'Tickets assignés' },
      { path: '/reports', icon: <FaChartBar />, text: 'Rapports' },
      { path: '/profile', icon: <FaUser />, text: 'Mon Profil' },
    ];
  }

  return (
    <div className="fixed top-0 left-0 h-screen w-64 bg-gray-800 text-white p-3 flex flex-col z-50 shadow-lg">
      <div className="mb-4">
        <h1 className="text-xl font-bold">Gestion Tickets</h1>
      </div>
      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center space-x-2 p-2 rounded-lg transition-colors text-base ${
                  isActive(item.path)
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                <span className="flex-1">{item.text}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-sm font-bold px-2 py-0.5 rounded-full min-w-[1.5rem] text-center flex-shrink-0">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
          <li>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 p-2 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white w-full text-base"
              disabled={loading}
            >
              <span className="text-xl flex-shrink-0">
                {loading ? (
                  <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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