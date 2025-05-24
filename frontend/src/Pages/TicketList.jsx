import React, { useState, useEffect, useMemo, useRef } from 'react';
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

const TicketList = () => {
  console.log('TicketList component rendered');
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Utilisation d'un nombre plus raisonnable, par exemple 10
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [updating, setUpdating] = useState({});
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);
  const [displayedTickets, setDisplayedTickets] = useState([]);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
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
      type_demande: searchParams.get('type_demande') || '',
      titre: searchParams.get('titre') || ''
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

  // Ajout d'un calcul du nombre total de rapports non lus pour l'utilisateur connecté
  const totalUnreadReports = useMemo(() => {
    if (!tickets || !user) return 0;
    return tickets.filter(ticket => ticket.Id_Demandeur === user.id && ticket.reports && ticket.reports.some(r => !r.is_viewed)).length;
  }, [tickets, user]);

  // Fonction de filtrage des tickets avec rapports non lus
  const [showUnreadReportsOnly, setShowUnreadReportsOnly] = useState(false);
  // Supprimer le useMemo filteredTickets car le filtrage est maintenant fait au backend
  // const filteredTickets = useMemo(() => {
  //   if (!showUnreadReportsOnly) return tickets;
  //   return tickets.filter(ticket => ticket.Id_Demandeur === user.id && ticket.reports && ticket.reports.some(r => !r.is_viewed));
  // }, [tickets, showUnreadReportsOnly, user]);

  // Effet pour mettre à jour les tickets affichés lorsque les filtres changent
  useEffect(() => {
    // Cet effet n'est plus nécessaire, la mise à jour de displayedTickets se fait dans fetchTickets
  }, []); // Retirer les dépendances car l'effet est désactivé

  // Effet pour charger les tickets lorsque les filtres changent
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    console.log('Filters changed, fetching tickets with new filters:', filters, 'Unread Filter:', showUnreadReportsOnly);
    // Quand les filtres changent, on recommence à la première page en appliquant les filtres backend et frontend
    fetchTickets(true, 1, filters, showUnreadReportsOnly); 
  }, [filters, showUnreadReportsOnly]); // showUnreadReportsOnly doit être une dépendance ici

  // Effet pour le chargement initial
  useEffect(() => {
    console.log('useEffect [] - Running initial load effect');
    const initialLoad = async () => {
      setLoading(true);
      setSpin(true);
      try {
        console.log('initialLoad useEffect - Starting initial load');
        
        // Charger les options en premier
        try {
          const optionsResponse = await axios.get('/api/tickets/options');
          console.log('Options response:', optionsResponse.data);
          
          if (optionsResponse.data && optionsResponse.data.options) {
            const { options: optionsData, errors, hasErrors } = optionsResponse.data;
            
            if (optionsData.statuts) {
              console.log('Statuts chargés:', optionsData.statuts);
              setStatuts(optionsData.statuts);
            } else {
              console.warn('Aucun statut chargé');
              setStatuts([]);
            }
            
            if (optionsData.categories) setCategories(optionsData.categories);
            if (optionsData.demandeurs) setDemandeurs(optionsData.demandeurs);
            if (optionsData.societes) setSocietes(optionsData.societes);
            if (optionsData.emplacements) setEmplacements(optionsData.emplacements);
            if (optionsData.priorites) setPriorites(optionsData.priorites);
            if (optionsData.executants) setExecutants(optionsData.executants);

            filterCache.data = optionsData;
            filterCache.lastFetch = new Date().getTime();

            if (hasErrors) {
              console.warn('Erreurs lors du chargement des options:', errors);
              setError('Certaines options de filtrage ne sont pas disponibles. Les filtres peuvent être limités.');
            }
          } else {
            console.error('Format de réponse invalide:', optionsResponse.data);
            setError('Format de réponse invalide pour les options de filtrage');
          }
        } catch (optionsError) {
          console.error('Erreur lors du chargement des options:', optionsError);
          setStatuts([]);
          setCategories([]);
          setDemandeurs([]);
          setSocietes([]);
          setEmplacements([]);
          setPriorites([]);
          setExecutants([]);
          setError('Erreur lors du chargement des options de filtrage. Les filtres peuvent ne pas être disponibles.');
        }

        // Charger les tickets ensuite
        const ticketsResponse = await axios.get('/api/tickets', {
          params: {
            ...filters,
            page: 1,
            per_page: itemsPerPage
          }
        });

        const ticketsData = ticketsResponse.data;
        setTickets(ticketsData.data);
        setAllTickets(ticketsData.data);
        setTotalPages(ticketsData.last_page);
        ticketCache.tickets = ticketsData.data;
        ticketCache.lastFetch = new Date().getTime();

        // Afficher tous les tickets de la première page initialement
        setDisplayedTickets(ticketsData.data);
        setInitialLoadDone(true);
        setPage(1); // S'assurer que la page est bien à 1 au chargement initial
        setHasMore(1 < ticketsData.last_page); // Déterminer si plus de pages existent

      } catch (err) {
        setError('Erreur lors du chargement des tickets');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
        setSpin(false);
      }
    };
    initialLoad();
  }, []); // Exécuté une seule fois au montage

  // Modifier fetchTickets pour utiliser les filtres et le paramètre backend pour rapports non lus
  const fetchTickets = async (force = false, pageNum = page, appliedFilters = null, applyUnreadFilter = showUnreadReportsOnly) => {
    console.log('fetchTickets called with filters:', appliedFilters || filters, 'Page:', pageNum, 'Unread Filter (sent to backend):', applyUnreadFilter);
    setSpin(true);
    const currentFilters = appliedFilters || filters;
    
    try {
      // Logique de cache (à potentiellement adapter si le cache doit distinguer les filtres)
      if (!force && ticketCache.tickets && ticketCache.lastFetch) {
        const now = new Date().getTime();
        if (now - ticketCache.lastFetch < ticketCache.cacheDuration) {
          console.log('Using cached tickets');
          const cachedTickets = ticketCache.tickets;
          setTickets(cachedTickets);
          setAllTickets(cachedTickets);
          
          if (!initialLoadDone) {
            setDisplayedTickets(cachedTickets.slice(0, 2));
            setInitialLoadDone(true);
          }
          
          setLoading(false);
          setSpin(false);
          return;
        }
      }

      console.log('Fetching tickets with filters:', currentFilters, 'Page:', pageNum, 'Items per page:', itemsPerPage, 'Unread Filter (sent to backend):', applyUnreadFilter);

      const response = await axios.get('/api/tickets', {
        params: { 
          ...currentFilters,
          page: pageNum,
          per_page: itemsPerPage,
          // Ajouter le paramètre pour le filtrage backend des rapports non lus
          filter_unread_reports: applyUnreadFilter ? true : undefined // Envoyer true si le filtre est actif, undefined sinon
        }
      });

      const ticketsData = response.data;
      const newTickets = ticketsData.data || [];
      const total = ticketsData.total || 0;
      const lastPage = ticketsData.last_page || 1;

      console.log('Received tickets:', newTickets.length, 'Total:', total, 'Last Page:', lastPage);

      // Le filtrage par rapports non lus est maintenant fait au backend, donc pas de filtrage local ici
      const processedTickets = newTickets; // Utiliser directement les tickets reçus du backend

      if (pageNum === 1) {
        ticketCache.tickets = newTickets; // Le cache stocke potentiellement tous les tickets de la première requête
        ticketCache.lastFetch = new Date().getTime();
        // Pour la première page, remplacer les tickets existants avec les nouveaux tickets reçus
        setTickets(processedTickets);
        // setAllTickets(newTickets); // allTickets n'est peut-être pas nécessaire dans cette approche

        // Afficher les tickets de la première page
        setDisplayedTickets(processedTickets);
        console.log('Displayed tickets after initial load:', processedTickets.length, processedTickets);

      } else {
        // Pour les pages suivantes, ajouter les nouveaux tickets aux listes existantes
        setTickets(prev => [...prev, ...processedTickets]);
        // setAllTickets(prev => [...prev, ...newTickets]); // allTickets n'est peut-être pas nécessaire
        
        // Ajouter les nouveaux tickets à la liste affichée
        setDisplayedTickets(prev => {
          const updatedDisplayed = [...prev, ...processedTickets];
          console.log('Displayed tickets after loading page', pageNum, ':', updatedDisplayed.length, updatedDisplayed);
          return updatedDisplayed;
        });
      }

      setTotalPages(lastPage);
      // hasMore basé sur la pagination backend
      setHasMore(pageNum < lastPage);
      setPage(pageNum); // Mettre à jour le numéro de page courant
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

  // Modifier l'effet pour l'intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        // Déclencher le chargement si l'élément est visible et qu'il y a plus de pages
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          console.log('Intersection observer triggered', { page, totalPages, hasMore, isLoadingMore });
          setIsLoadingMore(true);
          // Appeler fetchTickets pour charger la page suivante avec les filtres actuels (y compris le filtre rapports non lus)
          fetchTickets(false, page + 1, filters, showUnreadReportsOnly); 
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoadingMore, page, totalPages, filters, itemsPerPage, showUnreadReportsOnly]); // showUnreadReportsOnly doit être une dépendance ici

  // Fonction pour gérer le changement de filtre
  const handleFilterChange = (filterName, value) => {
    console.log('Filter changed:', filterName, value);
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Fonction pour gérer le clic sur les boutons de statut
  const handleStatutButtonClick = (statutId) => {
    const newStatut = filters.statut === statutId ? '' : statutId;
    handleFilterChange('statut', newStatut);
    
    // Mettre à jour l'URL
    const newSearchParams = new URLSearchParams(searchParams);
    if (newStatut !== '') {
      newSearchParams.set('statut', newStatut.toString());
    } else {
      newSearchParams.delete('statut');
    }
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

      // Mettre à jour également displayedTickets pour refléter le changement immédiatement
      setDisplayedTickets(prevDisplayedTickets => prevDisplayedTickets.map(ticket => {
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

      // Mettre à jour allTickets également
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

  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    console.log('Resetting filters');
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
      type_demande: '',
      titre: ''
    });
    fetchTickets(true, 1, {}, showUnreadReportsOnly);
  };

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

  useEffect(() => {
    // Écouter l'événement de rapports marqués comme vus
    const handleReportsViewed = (event) => {
      const { ticketId } = event.detail;
      setTickets(prevTickets => 
        prevTickets.map(ticket => {
          if (ticket.id === ticketId) {
            return {
              ...ticket,
              reports: ticket.reports.map(report => ({ ...report, is_viewed: true }))
            };
          }
          return ticket;
        })
      );
    };

    window.addEventListener('reportsViewed', handleReportsViewed);

    return () => {
      window.removeEventListener('reportsViewed', handleReportsViewed);
    };
  }, []);

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
                to="/create-ticket"
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
          {/* Groupe Type de demande à droite + bouton Rapports non lus */}
          <div className="flex gap-2 items-center">
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
            {/* Bouton Rapports non lus */}
            {(niveau === '1' || niveau === 1) && (
              <button
                onClick={() => setShowUnreadReportsOnly(v => !v)}
                className={`flex items-center px-4 py-2 rounded-full text-sm font-semibold transition-colors border border-red-200 ${
                  showUnreadReportsOnly ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700 hover:bg-red-200'
                } ${totalUnreadReports === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                disabled={totalUnreadReports === 0}
                title="Afficher uniquement les tickets avec des rapports non lus"
              >
                <span className="mr-2">🔴 Rapports non lus</span>
                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold bg-red-600 text-white rounded-full">
                  {totalUnreadReports}
                </span>
              </button>
            )}
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
              {/* Rechercher par titre */}
              <div className="flex flex-col w-full gap-2 md:col-span-3">
                <label className="text-sm font-medium text-gray-700">Rechercher par titre</label>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Rechercher par titre"
                  value={filters.titre || ''}
                  onChange={e => setFilters({ ...filters, titre: e.target.value })}
                />
              </div>
              {/* Société */}
              <div className="flex flex-col w-full gap-2">
                <label className="text-sm font-medium text-gray-700">Société</label>
                <select
                  value={filters.societe}
                  onChange={(e) => handleFilterChange('societe', e.target.value)}
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
                  onChange={(e) => handleFilterChange('demandeur', e.target.value)}
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
                  onChange={(e) => handleFilterChange('categorie', e.target.value)}
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
                  onChange={(e) => handleFilterChange('emplacement', e.target.value)}
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
                  onChange={(e) => handleFilterChange('priorite', e.target.value)}
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
                  onChange={(e) => handleFilterChange('executant', e.target.value)}
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
                  onChange={(e) => handleFilterChange('dateDebut', e.target.value)}
                  className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Du"
                />
                <input
                  type="date"
                  value={filters.dateDebutFin}
                  onChange={(e) => handleFilterChange('dateDebutFin', e.target.value)}
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
                  onChange={(e) => handleFilterChange('dateFinPrevueDebut', e.target.value)}
                  className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Du"
                />
                <input
                  type="date"
                  value={filters.dateFinPrevueFin}
                  onChange={(e) => handleFilterChange('dateFinPrevueFin', e.target.value)}
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
                  onChange={(e) => handleFilterChange('dateFinReelleDebut', e.target.value)}
                  className="form-input block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Du"
                />
                <input
                  type="date"
                  value={filters.dateFinReelleFin}
                  onChange={(e) => handleFilterChange('dateFinReelleFin', e.target.value)}
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
          {displayedTickets.map((ticket) => (
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
                      {ticket.reports && ticket.reports.filter(report => !report.is_viewed).length > 0 && 
                       ticket.Id_Demandeur === user?.id && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700 border border-red-200">
                          {ticket.reports.filter(report => !report.is_viewed).length} rapport(s) non lu(s)
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
                {(niveau === '1' || niveau === 1) && (
                  <select
                    value={ticket.Id_Statut}
                    onChange={e => handleStatutChange(ticket.id, e.target.value)}
                    className="mb-2 px-2 py-1 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    disabled={updating[ticket.id]}
                  >
                    {statuts && statuts.length > 0 ? (
                      statuts.map(s => (
                        <option key={s.id} value={s.id}>{s.designation}</option>
                      ))
                    ) : (
                      <option value="">Chargement des statuts...</option>
                    )}
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
          
          {/* Ajouter l'élément de référence pour l'intersection observer */}
          <div ref={observerTarget} className="h-10 flex items-center justify-center">
            {isLoadingMore && (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TicketList; 