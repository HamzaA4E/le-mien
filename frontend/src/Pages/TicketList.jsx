import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';

const STATUTS = [
  { id: 1, label: 'En instance' },
  { id: 2, label: 'En cours' },
  { id: 3, label: 'Clôturé' },
];

// Cache pour les tickets
const ticketCache = {
  tickets: null,
  lastFetch: null,
  // Durée de validité du cache (5 minutes)
  cacheDuration: 5 * 60 * 1000
};

const TicketList = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState({});
  const [statuts, setStatuts] = useState([]);

  // Récupérer le user depuis le localStorage
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch (e) {
    user = null;
  }
  const niveau = user?.niveau;

  const fetchTickets = async () => {
    try {
      // Vérifier si on peut utiliser le cache
      if (ticketCache.tickets && ticketCache.lastFetch) {
        const now = new Date().getTime();
        if (now - ticketCache.lastFetch < ticketCache.cacheDuration) {
          setTickets(ticketCache.tickets);
          setLoading(false);
          return;
        }
      }

      const response = await axios.get('/api/tickets');
      const newTickets = response.data.data || response.data;
      
      // Mettre à jour le cache
      ticketCache.tickets = newTickets;
      ticketCache.lastFetch = new Date().getTime();

      setTickets(newTickets);
      setError('');
    } catch (err) {
      setError('Erreur lors du chargement des tickets');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatuts = async () => {
    try {
      const response = await axios.get('/api/statuts');
      setStatuts(response.data);
    } catch (err) {
      console.error('Erreur lors du chargement des statuts:', err);
    }
  };

  const handleStatutChange = async (ticketId, newStatutId) => {
    if (!newStatutId) return; // Ne rien faire si aucun statut n'est sélectionné
    
    setUpdating((prev) => ({ ...prev, [ticketId]: true }));
    try {
      console.log('Envoi de la requête de mise à jour:', {
        ticketId,
        newStatutId,
        url: `/api/tickets/${ticketId}`,
        data: { id_statut: newStatutId }
      });

      const response = await axios.put(`/api/tickets/${ticketId}`, { id_statut: newStatutId });
      
      console.log('Réponse du serveur:', response.data);

      // Mettre à jour le statut localement avec les données complètes du ticket
      setTickets((prevTickets) => {
        const updatedTickets = prevTickets.map((t) =>
          t.id === ticketId
            ? { ...t, Id_Statut: response.data.Id_Statut, statut: response.data.statut }
            : t
        );
        // Mettre à jour le cache pour garder la cohérence
        ticketCache.tickets = updatedTickets;
        return updatedTickets;
      });
    } catch (err) {
      console.error('Erreur détaillée:', err.response?.data || err.message);
      alert(`Erreur lors du changement de statut: ${err.response?.data?.message || err.message}`);
    } finally {
      setUpdating((prev) => ({ ...prev, [ticketId]: false }));
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchStatuts();
  }, []);

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    // Si c'est un objet Laravel (date, timezone_type, timezone)
    let dateString = dateValue;
    if (typeof dateValue === 'object' && dateValue.date) {
      dateString = dateValue.date;
    }
    // On coupe à la seconde si besoin (ex: 2025-05-14 16:34:24.000000)
    if (typeof dateString === 'string' && dateString.includes('.')) {
      dateString = dateString.split('.')[0];
    }
    // Format ISO pour JS
    const isoString = dateString.replace(' ', 'T');
    const date = new Date(isoString);
    return isNaN(date) ? '-' : date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTicketSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-24 bg-gray-200 rounded mb-4"></div>
      <div className="h-24 bg-gray-200 rounded mb-4"></div>
      <div className="h-24 bg-gray-200 rounded mb-4"></div>
    </div>
  );

  if (loading && !tickets.length) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Liste des Tickets</h1>
          </div>
          {renderTicketSkeleton()}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Liste des Tickets</h1>
          {/* Masquer le bouton de création pour le responsable */}
          {!(niveau === '2' || niveau === 2) && (
            <Link
              to="/tickets/create"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Créer un ticket
            </Link>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 flex flex-col md:flex-row items-center justify-between min-h-[120px] px-4 py-3"
              >
                <div className="flex-1 flex flex-col md:flex-row md:items-center md:gap-6 w-full">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {ticket.Titre}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-1 mb-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {ticket.statut?.designation || 'Sans statut'}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {ticket.priorite?.designation || 'Sans priorité'}
                      </span>
                      {!(niveau === '2' || niveau === 2) && (
                        <select
                          value={ticket.Id_Statut || ''}
                          onChange={e => handleStatutChange(ticket.id, e.target.value)}
                          disabled={updating[ticket.id]}
                          className="ml-2 px-2 py-1 border rounded text-xs"
                        >
                          <option value="">Changer statut</option>
                          {statuts.map(s => (
                            <option key={s.id} value={s.id}>{s.designation}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="flex flex-col md:flex-row md:gap-4 text-xs text-gray-500 mb-1">
                      <span>Demandeur : <span className="font-medium text-gray-700">{ticket.demandeur?.designation || 'Non spécifié'}</span></span>
                      <span>Créé le : <span className="font-medium text-gray-700">{formatDate(ticket.DateCreation)}</span></span>
                    </div>
                    {ticket.description && (
                      <div className="mt-1">
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {ticket.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 md:mt-0 md:ml-4 flex-shrink-0">
                  <Link
                    to={`/tickets/${ticket.id}`}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium border border-blue-100 rounded px-3 py-1 transition-colors"
                  >
                    Voir détails
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TicketList; 