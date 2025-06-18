import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const CountersContext = createContext();

export const useCounters = () => {
  const context = useContext(CountersContext);
  if (!context) {
    throw new Error('useCounters must be used within a CountersProvider');
  }
  return context;
};

export const CountersProvider = ({ children }) => {
  const [counters, setCounters] = useState({
    pendingTickets: 0,
    completedTickets: 0,
    pendingRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCounters = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      // Récupérer tous les compteurs en une seule requête
      const countersResponse = await axios.get('/api/tickets/counters', { headers });
      const ticketCounters = countersResponse.data;
      
      // Récupérer le nombre de demandes en attente (admin seulement)
      let requestsCount = 0;
      const user = JSON.parse(localStorage.getItem('user'));
      if (user && user.niveau === 1) {
        const requestsResponse = await axios.get('/api/admin/register-requests/count', { headers });
        requestsCount = requestsResponse.data.count;
      }

      setCounters({
        pendingTickets: ticketCounters.pending || 0,
        completedTickets: ticketCounters.completed || 0,
        pendingRequests: requestsCount
      });
      
      setError(null);
    } catch (error) {
      console.error('Error fetching counters:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounters();
    
    // Rafraîchir toutes les 3 minutes
    const interval = setInterval(fetchCounters, 180000); // 3 minutes
    
    return () => clearInterval(interval);
  }, [fetchCounters]);

  // Fonction pour forcer le rafraîchissement (appelée après actions)
  const refreshCounters = useCallback(() => {
    fetchCounters();
  }, [fetchCounters]);

  const value = {
    counters,
    loading,
    error,
    refreshCounters
  };

  return (
    <CountersContext.Provider value={value}>
      {children}
    </CountersContext.Provider>
  );
}; 