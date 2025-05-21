import React, { useState, useEffect, useMemo } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { Link, useSearchParams } from 'react-router-dom';
import { FaSyncAlt, FaFilter, FaTimes } from 'react-icons/fa';
import { BiCategory } from 'react-icons/bi';
import { MdPerson, MdBusinessCenter, MdLocationOn, MdDateRange } from 'react-icons/md';

// Mapping des couleurs pour les types de demande
const TYPE_COLORS = {
  'Tâche': { bg: 'bg-fuchsia-300', text: 'text-fuchsia-950', border: 'border-fuchsia-200' },
  'Projet': { bg: 'bg-stone-300', text: 'text-stone-900', border: 'border-stone-200' },
  'default': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' }
};

// Fonction pour supprimer les accents d'une chaîne et remplacer les espaces par underscores
const normalizeString = (str) => {
  if (!str) return '';
  // Use NFD normalization to separate base characters and combining marks
  // Then remove all combining diacritical marks (range U+0300 to U+036F)
  // Then convert to lowercase and replace spaces with underscores
  return str.normalize("NFD").replace(/\u0300-\u036f/g, "").toLowerCase().replace(/ /g, '_');
}

// Cache pour les tickets et les filtres
const ticketCache = {
  tickets: null,
  lastFetch: null,
  cacheDuration: 5 * 60 * 1000 // 5 minutes
};
const filterCache = {
  data: null,
  lastFetch: null,
  cacheDuration: 5 * 60 * 1000 // 5 minutes
};

const TicketList = () => {
  console.log('TicketList component rendered');
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [updating, setUpdating] = useState({});
  
  // Initialiser l'état des statuts comme null ou vide en attendant le chargement
  const [statuts, setStatuts] = useState([]);
  
  const [spin, setSpin] = useState(false);
  
  // Ajouter une référence pour suivre si le chargement initial est terminé
  const isInitialLoad = React.useRef(true);

  // États pour les filtres - Initialisés depuis l'URL
  const [filters, setFilters] = useState(() => {
    const initialStatut = searchParams.get('statut');
    return {
      categorie: searchParams.get('categorie') || '',
      demandeur: searchParams.get('demandeur') || '',
      societe: searchParams.get('societe') || '',
      emplacement: searchParams.get('emplacement') || '',
      statut: initialStatut !== null && initialStatut !== '' ? parseInt(initialStatut, 10) : '', // Convertir en nombre
      priorite: searchParams.get('priorite') || '',
      executant: searchParams.get('executant') || '',
      dateDebut: searchParams.get('dateDebut') || '',
      dateDebutFin: searchParams.get('dateDebutFin') || '',
      dateFinPrevueDebut: searchParams.get('dateFinPrevueDebut') || '',
      dateFinPrevueFin: searchParams.get('dateFinPrevueFin') || '',
      dateFinReelleDebut: searchParams.get('dateFinReelleDebut') || '',
      dateFinReelleFin: searchParams.get('dateFinReelleFin') || '',
      type_demande: searchParams.get('type_demande') || ''
    };
  });
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const [demandeurs, setDemandeurs] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [emplacements, setEmplacements] = useState([]);
  const [priorites, setPriorites] = useState([]);
  const [executants, setExecutants] = useState([]);
  const [allTickets, setAllTickets] = useState([]);

  // Récupérer le user depuis le localStorage
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch (e) {
    user = null;
  }
  const niveau = user?.niveau;

  // Effet pour lire les paramètres d'URL et mettre à jour l'état des filtres.
  // Cet effet NE déclenche PAS la récupération initiale des tickets.
  // Rendu inutile car l'état initial des filtres est déjà basé sur l'URL.
  /*
  useEffect(() => {
    const statusFromUrl = searchParams.get('status');
    console.log('useEffect [searchParams] - URL changed', statusFromUrl);
  }, [searchParams]);
  */

  // Effet unique pour le chargement initial des données de filtre ET des tickets
  useEffect(() => {
    console.log('useEffect [] - Running initial load effect');
    const initialLoad = async () => {
        setLoading(true);
        setSpin(true);
        try {
            console.log('initialLoad useEffect - Starting initial load');
            
            // 1. Fetch all filter data first, including statuts
            const filterData = await fetchAllFilterData(true); 
            console.log('initialLoad useEffect - Filter data fetched:', filterData);
            
            // filterData contains statuts, which will update the `statuts` state via setStatuts inside fetchAllFilterData

            // 2. Now that filters (including statuts list) are potentially loaded,
            //    use the filters state (initialized from URL) to fetch tickets.
            console.log('initialLoad useEffect - Calling fetchTickets with initial state filters:', filters);
            await fetchTickets(true, 1, filters); // Pass the initial `filters` state directly

            // isInitialLoad.current = false; // Marquer le chargement initial comme terminé si nécessaire pour d'autres logiques

        } catch (err) {
            setError('Erreur lors du chargement initial des données');
            console.error('Erreur:', err);
            // Ensure loading indicators are hidden even on error
            setLoading(false);
            setSpin(false);
        }
    };
    initialLoad();

  }, []); // Exécuté une seule fois au montage

  // Effet pour charger les tickets lorsque les filtres changent (interactif) APRES le chargement initial
  useEffect(() => {
    // Utiliser une référence pour s'assurer que cet effet ne s'exécute pas au montage initial
    if (isInitialLoad.current) {
        isInitialLoad.current = false; // Marquer le chargement initial comme terminé
        console.log('useEffect [filters, statuts] - Skipping initial fetch because isInitialLoad is true');
        return; 
    }

    console.log('useEffect [filters, statuts] - filters or statuts state changed (interactive):', filters);
    
    // S'assurer que nous ne lançons pas un fetch avec des filtres incomplets si les statuts ne sont pas encore chargés
    // et que l'on a un filtre de statut sélectionné.
    if (filters.statut && statuts.length === 0) {
        console.log('useEffect [filters, statuts] - Statut filter set but statuts not loaded, skipping fetchTickets');
        return; // Attendre que les statuts soient chargés
    }

    console.log('useEffect [filters, statuts] - Calling fetchTickets due to filters change (interactive)');
    fetchTickets(true, 1, filters); // Utiliser l'état `filters` actuel pour le fetch
    
  }, [filters, statuts]); // Dépend de l'état local `filters` et `statuts`

  // Modifier fetchTickets pour accepter des filtres optionnels
  const fetchTickets = async (force = false, pageNum = page, appliedFilters = null) => {
    console.log('fetchTickets called - force:', force, 'pageNum:', pageNum, 'appliedFilters:', appliedFilters);
    setSpin(true);
    // Utiliser les filtres passés en argument, sinon utiliser l'état local filters
    const currentFilters = appliedFilters || filters;
    
    // Log pour vérifier les filtres envoyés à l'API
    console.log('fetchTickets - Using filters:', currentFilters);
    try {
      if (!force && ticketCache.tickets && ticketCache.lastFetch) {
        const now = new Date().getTime();
        if (now - ticketCache.lastFetch < ticketCache.cacheDuration) {
          console.log('fetchTickets - Using ticket cache');
          setTickets(ticketCache.tickets);
          setAllTickets(ticketCache.tickets);
          setLoading(false);
          setSpin(false);
          return;
        }
      }

      console.log('fetchTickets - Fetching from API with params:', { ...currentFilters, page: pageNum, per_page: itemsPerPage });

      const response = await axios.get(`/api/tickets`, {
        params: { 
          ...currentFilters,
          page: pageNum,
          per_page: itemsPerPage,
          // S'assurer que le statut est envoyé comme un entier ou null si vide
          statut: currentFilters.statut !== '' ? parseInt(currentFilters.statut, 10) : null
         }
      });

      const newTickets = response.data.data || [];
      const total = response.data.total || 0;
      const lastPage = response.data.last_page || 1;

      console.log('fetchTickets - Received tickets:', newTickets.length, 'Total:', total);

      if (pageNum === 1) {
        ticketCache.tickets = newTickets;
        ticketCache.lastFetch = new Date().getTime();
        console.log('fetchTickets - Setting tickets and allTickets (page 1)');
        setTickets(newTickets);
        setAllTickets(newTickets);
      } else {
        console.log('fetchTickets - Appending tickets');
        setTickets(prev => [...prev, ...newTickets]);
        setAllTickets(prev => [...prev, ...newTickets]);
      }

      setTotalPages(lastPage);
      setError('');
    } catch (err) {
      setError('Erreur lors du chargement des tickets');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      setTimeout(() => setSpin(false), 600);
    }
  };

  const fetchStatuts = async () => {
    try {
      const response = await axios.get('/api/statuts');
      // Mettre à jour le cache des filtres avec les statuts si nécessaire
       if (filterCache.data) {
          filterCache.data.statuts = response.data;
       }
      setStatuts(response.data);
    } catch (err) {
      console.error('Erreur lors du chargement des statuts:', err);
    }
  };

  // Fonction optimisée pour récupérer toutes les données de filtrage en une seule fois
  const fetchAllFilterData = async (force = false) => {
    const now = new Date().getTime();
    
    // Vérifier si les données en cache sont encore valides
    if (!force && filterCache.data && filterCache.lastFetch && 
        (now - filterCache.lastFetch < filterCache.cacheDuration)) {
      console.log('Using filter data cache');
      setCategories(filterCache.data.categories || []);
      setDemandeurs(filterCache.data.demandeurs || []);
      setSocietes(filterCache.data.societes || []);
      setEmplacements(filterCache.data.emplacements || []);
      setStatuts(filterCache.data.statuts || []);
      setPriorites(filterCache.data.priorites || []);
      setExecutants(filterCache.data.executants || []);
      return filterCache.data;
    }

    console.log('Fetching all filter data from API');
    try {
      // Définir les endpoints à appeler
      const endpoints = [
        { key: 'categories', url: '/api/categories' },
        { key: 'demandeurs', url: '/api/demandeurs' },
        { key: 'societes', url: '/api/societes' },
        { key: 'emplacements', url: '/api/emplacements' },
        { key: 'statuts', url: '/api/statuts' },
        { key: 'priorites', url: '/api/priorites' },
        { key: 'executants', url: '/api/executants' }
      ];

      // Créer un objet pour stocker les résultats
      const fetchedData = {
        categories: [],
        demandeurs: [],
        societes: [],
        emplacements: [],
        statuts: [],
        priorites: [],
        executants: []
      };

      // Faire les appels API en parallèle avec gestion d'erreur individuelle
      const results = await Promise.allSettled(
        endpoints.map(endpoint => 
          axios.get(endpoint.url)
            .then(response => ({ key: endpoint.key, data: response.data }))
            .catch(error => {
              console.error(`Error fetching ${endpoint.key}:`, error);
              return { key: endpoint.key, data: [] };
            })
        )
      );

      // Traiter les résultats
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          fetchedData[result.value.key] = result.value.data.filter(item => item.is_active !== false);
        }
      });

      // Mettre à jour le cache
      filterCache.data = fetchedData;
      filterCache.lastFetch = now;

      // Mettre à jour les états
      setCategories(fetchedData.categories);
      setDemandeurs(fetchedData.demandeurs);
      setSocietes(fetchedData.societes);
      setEmplacements(fetchedData.emplacements);
      setStatuts(fetchedData.statuts);
      setPriorites(fetchedData.priorites);
      setExecutants(fetchedData.executants);

      return fetchedData;

    } catch (err) {
      console.error('Erreur lors du chargement des données de filtrage:', err);
      // Ne pas effacer le cache en cas d'erreur partielle
      // filterCache.data = null;
      // filterCache.lastFetch = null;
      throw err;
    }
  };

  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    setFilters({
      categorie: '',
      demandeur: '',
      societe: '',
      emplacement: '',
      statut: '',
      priorite: '',
      executant: '',
      dateDebut: '',
      dateDebutFin: '',
      dateFinPrevueDebut: '',
      dateFinPrevueFin: '',
      dateFinReelleDebut: '',
      dateFinReelleFin: '',
      type_demande: ''
    });
    // Note: La navigation vers une URL sans paramètre pourrait être ajoutée ici
    // si vous souhaitez que la réinitialisation modifie également l'URL.
    // navigate('/tickets'); 
  };

  // Fonction pour extraire la date d'un objet date Laravel ou d'une chaîne
  const extractDate = (dateValue) => {
    if (!dateValue) return null;
    
    // Si c'est un objet Laravel (avec date, timezone_type, timezone)
    if (typeof dateValue === 'object' && dateValue.date) {
      return dateValue.date;
    }
    
    // Si c'est déjà une chaîne de date
    return dateValue;
  };

  // Fonction pour normaliser une date
  const normalizeDate = (dateString) => {
    if (!dateString) return null;
    
    // Extraire la date si c'est un objet Laravel
    const extractedDate = extractDate(dateString);
    if (!extractedDate) return null;

    const date = new Date(extractedDate);
    if (isNaN(date.getTime())) return null;
    
    // Normaliser à minuit UTC
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
  };

  // Fonction pour vérifier si une date est dans une plage
  const isDateInRange = (dateValue, startDate, endDate) => {
    if (!dateValue) return false;
    
    const normalizedDate = normalizeDate(dateValue);
    const normalizedStart = normalizeDate(startDate);
    const normalizedEnd = normalizeDate(endDate);

    if (!normalizedDate) return false;

    if (normalizedStart && normalizedEnd) {
      return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd;
    }
    if (normalizedStart) {
      return normalizedDate >= normalizedStart;
    }
    if (normalizedEnd) {
      return normalizedDate <= normalizedEnd;
    }
    return true;
  };

  // Optimisation du filtrage avec useMemo
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const baseFilters = (
        (!filters.categorie || String(ticket.Id_Categorie) === String(filters.categorie)) &&
        (!filters.demandeur || String(ticket.Id_Demandeur) === String(filters.demandeur)) &&
        (!filters.societe || String(ticket.Id_Societe) === String(filters.societe)) &&
        (!filters.emplacement || String(ticket.Id_Emplacement) === String(filters.emplacement)) &&
        (!filters.statut || String(ticket.Id_Statut) === String(filters.statut)) &&
        (!filters.priorite || String(ticket.Id_Priorite) === String(filters.priorite)) &&
        (!filters.executant || String(ticket.Id_Executant) === String(filters.executant)) &&
        (!filters.type_demande || (ticket.type_demande && ticket.type_demande.designation === filters.type_demande))
      );

      if (!baseFilters) return false;

      // Filtres de dates
      const dateDebutMatch = isDateInRange(
        ticket.DateDebut,
        filters.dateDebut,
        filters.dateDebutFin
      );

      const dateFinPrevueMatch = isDateInRange(
        ticket.DateFinPrevue,
        filters.dateFinPrevueDebut,
        filters.dateFinPrevueFin
      );

      const dateFinReelleMatch = isDateInRange(
        ticket.DateFinReelle,
        filters.dateFinReelleDebut,
        filters.dateFinReelleFin
      );

      // Si aucun filtre de date n'est appliqué, retourner true
      const hasDateFilters = filters.dateDebut || filters.dateDebutFin ||
                            filters.dateFinPrevueDebut || filters.dateFinPrevueFin ||
                            filters.dateFinReelleDebut || filters.dateFinReelleFin;

      if (!hasDateFilters) return true;

      // Vérifier les filtres de dates qui sont appliqués
      const dateDebutFilterApplied = filters.dateDebut || filters.dateDebutFin;
      const dateFinPrevueFilterApplied = filters.dateFinPrevueDebut || filters.dateFinPrevueFin;
      const dateFinReelleFilterApplied = filters.dateFinReelleDebut || filters.dateFinReelleFin;

      return (
        (!dateDebutFilterApplied || dateDebutMatch) &&
        (!dateFinPrevueFilterApplied || dateFinPrevueMatch) &&
        (!dateFinReelleFilterApplied || dateFinReelleMatch)
      );
    });
  }, [tickets, filters]);

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
      day: '2-digit'
    });
  };

  const renderTicketSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-24 bg-gray-200 rounded mb-4"></div>
      <div className="h-24 bg-gray-200 rounded mb-4"></div>
      <div className="h-24 bg-gray-200 rounded mb-4"></div>
    </div>
  );

  // Fonction pour gérer le clic sur les boutons de statut
  const handleStatutButtonClick = (statutId) => {
    const newStatut = filters.statut === statutId ? '' : statutId;
    setFilters(prev => ({
      ...prev,
      statut: newStatut // statutId est déjà un nombre ici
    }));
    // Mettre à jour l'URL lors du clic sur un bouton de statut rapide
    const newSearchParams = new URLSearchParams(searchParams);
    if (newStatut !== '') {
      newSearchParams.set('statut', newStatut.toString()); // Convertir en chaîne pour l'URL
    } else {
      newSearchParams.delete('statut');
    }
    // Remplace l'historique pour ne pas empiler les clics rapides
    window.history.replaceState(null, '', `?${newSearchParams.toString()}`);
  };

  // Fonction pour gérer le changement de statut d'un ticket (pour admin)
  const handleStatutChange = async (ticketId, newStatutId) => {
    setUpdating(prev => ({ ...prev, [ticketId]: true }));
    try {
      console.log('Updating ticket status:', { ticketId, newStatutId });
      
      // Trouver le statut sélectionné pour vérifier s'il s'agit d'une clôture
      const selectedStatut = statuts.find(s => s.id === parseInt(newStatutId, 10));
      const isCloture = selectedStatut?.designation === 'Clôturé';

      // Préparer les données à envoyer
      const updateData = {
        Id_Statut: parseInt(newStatutId, 10)
      };

      // Si c'est une clôture, ajouter la date de fin réelle
      if (isCloture) {
        updateData.DateFinReelle = new Date().toISOString().split('T')[0];
      }

      const response = await axios.put(`/api/tickets/${ticketId}`, updateData);

      console.log('Server response:', response.data);

      // Mettre à jour l'état local des tickets avec la réponse
      setTickets(prevTickets => prevTickets.map(ticket => {
        if (ticket.id === ticketId) {
          // Mettre à jour le ticket avec les nouvelles données
          const updatedTicket = {
            ...ticket,
            Id_Statut: parseInt(newStatutId, 10),
            statut: response.data.statut, // Mettre à jour l'objet statut complet
            DateFinReelle: isCloture ? updateData.DateFinReelle : ticket.DateFinReelle // Mettre à jour la date de fin réelle si clôture
          };
          console.log('Updated ticket:', updatedTicket);
          return updatedTicket;
        }
        return ticket;
      }));

      setAllTickets(prevTickets => prevTickets.map(ticket => {
        if (ticket.id === ticketId) {
          return {
            ...ticket,
            Id_Statut: parseInt(newStatutId, 10),
            statut: response.data.statut,
            DateFinReelle: isCloture ? updateData.DateFinReelle : ticket.DateFinReelle
          };
        }
        return ticket;
      }));

      console.log('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      setError(error.response?.data?.message || 'Erreur lors de la mise à jour du statut du ticket.');
    } finally {
      setUpdating(prev => ({ ...prev, [ticketId]: false }));
    }
  };

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-blue-600 transition"
              title="Filtres"
            >
              <FaFilter className={showFilters ? 'text-blue-600' : ''} />
            </button>
            <button
              onClick={() => fetchTickets(true)}
              className="p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-blue-600 transition"
              title="Rafraîchir"
            >
              <FaSyncAlt className={spin ? 'animate-spin-once' : ''} />
            </button>
            {!(niveau === '2' || niveau === 2) && (
              <Link
                to="create-ticket"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Créer un ticket
              </Link>
            )}
          </div>
        </div>

        {/* Boutons de statut rapides */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-2">
          {/* Groupe Statuts à gauche */}
          <div className="flex gap-2">
            {statuts.map((statut) => (
              <button
                key={statut.id}
                onClick={() => handleStatutButtonClick(statut.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filters.statut === statut.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {statut.designation}
              </button>
            ))}
          </div>
          {/* Groupe Type de demande à droite */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilters(prev => ({ ...prev, type_demande: prev.type_demande === 'Tâche' ? '' : 'Tâche' }))}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filters.type_demande === 'Tâche'
                  ? 'bg-fuchsia-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tâche
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, type_demande: prev.type_demande === 'Projet' ? '' : 'Projet' }))}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filters.type_demande === 'Projet'
                  ? 'bg-stone-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Projet
            </button>
          </div>
        </div>

        {/* Section des filtres */}
        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Filtres</h2>
              <button
                onClick={resetFilters}
                className="text-sm text-gray-600 hover:text-red-600 flex items-center gap-1"
              >
                <FaTimes /> Réinitialiser
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Société */}
              <div className="flex flex-col w-full gap-2">
                <label className="text-sm font-medium text-gray-700">Société</label>
                <select
                  value={filters.societe}
                  onChange={(e) => setFilters(prev => ({ ...prev, societe: e.target.value }))}
                  className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Toutes</option>
                  {societes.map(soc => (
                    <option key={soc.id} value={soc.id}>{soc.designation}</option>
                  ))}
                </select>
              </div>
              {/* Demandeur */}
              <div className="flex flex-col w-full gap-2">
                <label className="text-sm font-medium text-gray-700">Demandeur</label>
                <select
                  value={filters.demandeur}
                  onChange={(e) => setFilters(prev => ({ ...prev, demandeur: e.target.value }))}
                  className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Tous</option>
                  {demandeurs.map(dem => (
                    <option key={dem.id} value={dem.id}>{dem.designation}</option>
                  ))}
                </select>
              </div>
              {/* Catégorie */}
              <div className="flex flex-col w-full gap-2">
                <label className="text-sm font-medium text-gray-700">Catégorie</label>
                <select
                  value={filters.categorie}
                  onChange={(e) => setFilters(prev => ({ ...prev, categorie: e.target.value }))}
                  className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Toutes</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.designation}</option>
                  ))}
                </select>
              </div>
              {/* Emplacement */}
              <div className="flex flex-col w-full gap-2">
                <label className="text-sm font-medium text-gray-700">Emplacement</label>
                <select
                  value={filters.emplacement}
                  onChange={(e) => setFilters(prev => ({ ...prev, emplacement: e.target.value }))}
                  className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Tous</option>
                  {emplacements.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.designation}</option>
                  ))}
                </select>
              </div>
              {/* Priorité */}
              <div className="flex flex-col w-full gap-2">
                <label className="text-sm font-medium text-gray-700">Priorité</label>
                <select
                  value={filters.priorite}
                  onChange={(e) => setFilters(prev => ({ ...prev, priorite: e.target.value }))}
                  className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Toutes</option>
                  {priorites.map(p => (
                    <option key={p.id} value={p.id}>{p.designation}</option>
                  ))}
                </select>
              </div>
              {/* Exécutant */}
              <div className="flex flex-col w-full gap-2">
                <label className="text-sm font-medium text-gray-700">Exécutant</label>
                <select
                  value={filters.executant}
                  onChange={(e) => setFilters(prev => ({ ...prev, executant: e.target.value }))}
                  className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Tous</option>
                  {executants.map(exec => (
                    <option key={exec.id} value={exec.id}>{exec.nom}</option>
                  ))}
                </select>
              </div>
              {/* Date de début */}
              <div className="flex flex-col w-full gap-2">
                <label className="text-sm font-medium text-gray-700">Date de début</label>
                <input
                  type="date"
                  value={filters.dateDebut}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateDebut: e.target.value }))}
                  className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Du"
                />
                <input
                  type="date"
                  value={filters.dateDebutFin}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateDebutFin: e.target.value }))}
                  className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Au"
                />
              </div>
              {/* Date de fin prévue */}
              <div className="flex flex-col w-full gap-2">
                <label className="text-sm font-medium text-gray-700">Date de fin prévue</label>
                <input
                  type="date"
                  value={filters.dateFinPrevueDebut}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFinPrevueDebut: e.target.value }))}
                  className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Du"
                />
                <input
                  type="date"
                  value={filters.dateFinPrevueFin}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFinPrevueFin: e.target.value }))}
                  className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Au"
                />
              </div>
              {/* Date de fin réelle */}
              <div className="flex flex-col w-full gap-2">
                <label className="text-sm font-medium text-gray-700">Date de fin réelle</label>
                <input
                  type="date"
                  value={filters.dateFinReelleDebut}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFinReelleDebut: e.target.value }))}
                  className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Du"
                />
                <input
                  type="date"
                  value={filters.dateFinReelleFin}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFinReelleFin: e.target.value }))}
                  className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Au"
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
              className={`rounded-2xl shadow-lg border flex flex-col md:flex-row items-center justify-between min-h-[140px] px-6 py-5 mb-6 transition-transform hover:scale-[1.015] hover:shadow-2xl group`}
                  style={{ transition: 'box-shadow 0.2s, transform 0.2s' }}
                >
                  <div className="flex-1 flex flex-col w-full">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-gray-900 uppercase tracking-wide group-hover:text-blue-700 transition-colors">
                          {ticket.Titre}
                        </h3>
                        <div className="flex gap-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                            {ticket.statut?.designation || 'Sans statut'}
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 border border-green-200">
                            {ticket.priorite?.designation || 'Sans priorité'}
                          </span>
                          {(() => {
                            const typeColors = ticket.type_demande?.designation 
                              ? (TYPE_COLORS[ticket.type_demande.designation] || TYPE_COLORS.default)
                              : TYPE_COLORS.default;
                            return (
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${typeColors.bg} ${typeColors.text} border ${typeColors.border}`}>
                                {ticket.type_demande?.designation || 'Sans type'}
                              </span>
                            );
                          })()}
                          {ticket.statut?.designation === 'Clôturé' && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-gray-700 border border-gray-200">
                              Clôturé le : {formatDate(ticket.DateFinReelle)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-base text-gray-700 mb-4 line-clamp-2">
                        {ticket.Description || 'Aucune description'}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                        <div>
                          <span className="text-gray-500">Demandeur :</span>
                          <span className="font-semibold text-gray-900 ml-1">{ticket.demandeur?.designation || 'Non spécifié'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Exécutant :</span>
                          <span className="font-semibold text-gray-900 ml-1">{ticket.executant?.designation || 'Non assigné'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Date début :</span>
                          <span className="font-semibold text-gray-900 ml-1">{formatDate(ticket.DateDebut)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Date fin prévue :</span>
                          <span className="font-semibold text-gray-900 ml-1">{formatDate(ticket.DateFinPrevue)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Société :</span>
                          <span className="font-semibold text-gray-900 ml-1">{ticket.societe?.designation || 'Non spécifiée'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Emplacement :</span>
                          <span className="font-semibold text-gray-900 ml-1">{ticket.emplacement?.designation || 'Non spécifié'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Catégorie :</span>
                          <span className="font-semibold text-gray-900 ml-1">{ticket.categorie?.designation || 'Non spécifiée'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
              <div className="mt-6 md:mt-0 md:ml-6 flex-shrink-0 flex flex-col items-end justify-between h-full gap-2">
                {/* Menu déroulant pour changer le statut (visible uniquement pour l'administrateur) */}
                {statuts.length > 0 && (niveau === '1' || niveau === 1) && (
                  <select
                    value={ticket.Id_Statut}
                    onChange={e => handleStatutChange(ticket.id, e.target.value)}
                    className="mb-2 px-2 py-1 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    disabled={updating[ticket.id]}
                  >
                    {statuts.map(s => (
                      <option key={s.id} value={s.id}>{s.designation}</option>
                    ))}
                  </select>
                )}
                {/* Pour les non-administrateurs, afficher simplement le statut actuel */}
                {!(niveau === '1' || niveau === 1) && (
                  <div className="mb-2 px-2 py-1 text-sm text-gray-700">
                    Statut : {ticket.statut?.designation || 'Non défini'}
                  </div>
                )}
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="inline-flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 font-semibold px-5 py-2 rounded-lg shadow transition-colors text-base"
                    >
                      <svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' /></svg>
                      Voir détails
                    </Link>
                  </div>
                </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default TicketList; 