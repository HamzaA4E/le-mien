import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  return str.normalize("NFD").replace(/\u0300-\u036f/g, "").toLowerCase().replace(/ /g, '_');
}

// Hook personnalisé pour le debounce
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Cache pour les tickets et les filtres
const ticketCache = {
  tickets: null,
  lastFetch: null,
  cacheDuration: 5 * 60 * 1000 // 5 minutes
};

const TicketList = () => {
  const [searchParams] = useSearchParams();
  const [allTickets, setAllTickets] = useState([]); // Tous les tickets chargés
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef(null);
  const [spin, setSpin] = useState(false);
  const [showUnreadReportsOnly, setShowUnreadReportsOnly] = useState(false);
  
  // États pour les filtres
  const [filters, setFilters] = useState(() => ({
    categorie: searchParams.get('categorie') || '',
    demandeur: searchParams.get('demandeur') || '',
    societe: searchParams.get('societe') || '',
    emplacement: searchParams.get('emplacement') || '',
    statut: searchParams.get('statut') ? parseInt(searchParams.get('statut'), 10) : '',
    priorite: searchParams.get('priorite') || '',
    executant: searchParams.get('executant') || '',
    dateDebut: searchParams.get('dateDebut') || '',
    dateDebutFin: searchParams.get('dateDebutFin') || '',
    dateFinPrevueDebut: searchParams.get('dateFinPrevueDebut') || '',
    dateFinPrevueFin: searchParams.get('dateFinPrevueFin') || '',
    dateFinReelleDebut: searchParams.get('dateFinReelleDebut') || '',
    dateFinReelleFin: searchParams.get('dateFinReelleFin') || '',
    type_demande: searchParams.get('type_demande') || '',
    titre: searchParams.get('titre') || '',
    showRejectedByDemandeur: false
  }));

  // Filtre de titre local (sans debounce pour l'affichage immédiat)
  const [localTitleFilter, setLocalTitleFilter] = useState(filters.titre);
  
  // Filtre de titre avec debounce pour les requêtes serveur
  const debouncedTitleFilter = useDebounce(localTitleFilter, 500);

  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const [demandeurs, setDemandeurs] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [emplacements, setEmplacements] = useState([]);
  const [priorites, setPriorites] = useState([]);
  const [executants, setExecutants] = useState([]);
  const [statuts, setStatuts] = useState([]);

  // Récupérer le user depuis le localStorage
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch (e) {
    user = null;
  }
  const niveau = user?.niveau;

  // Fonction de filtrage local
  const filterTicketsLocally = useCallback((tickets, titleFilter) => {
    if (!titleFilter.trim()) return tickets;
    
    const searchTerm = titleFilter.toLowerCase();
    return tickets.filter(ticket => 
      ticket.Titre?.toLowerCase().includes(searchTerm) ||
      ticket.Description?.toLowerCase().includes(searchTerm)
    );
  }, []);

  // Calcul du nombre de tickets refusés par le demandeur
  const rejectedTicketsCount = useMemo(() => {
    if (!allTickets || !(niveau === '1' || niveau === 1)) return 0;
    return allTickets.filter(ticket => 
      ticket.reports && 
      ticket.reports.some(report => 
        report.type === 'rejet' && 
        report.Id_Demandeur === ticket.Id_Demandeur
      )
    ).length;
  }, [allTickets, niveau]);

  // Tickets filtrés localement
  const filteredTickets = useMemo(() => {
    let filtered = allTickets;
    
    // Filtrage par titre en local
    if (localTitleFilter.trim()) {
      filtered = filterTicketsLocally(filtered, localTitleFilter);
    }

    // Pour les administrateurs, gérer l'affichage des tickets refusés par le demandeur
    if (niveau === '1' || niveau === 1) {
      if (filters.showRejectedByDemandeur) {
        // Si le filtre est activé, ne montrer que les tickets refusés par le demandeur
        filtered = filtered.filter(ticket => 
          ticket.reports && 
          ticket.reports.some(report => 
            report.type === 'rejet' && 
            report.Id_Demandeur === ticket.Id_Demandeur
          )
        );
      } else {
        // Par défaut, exclure les tickets refusés par le demandeur
        filtered = filtered.filter(ticket => 
          !(ticket.reports && 
            ticket.reports.some(report => 
              report.type === 'rejet' && 
              report.Id_Demandeur === ticket.Id_Demandeur
            )
          )
        );
      }
    }

    return filtered;
  }, [allTickets, localTitleFilter, filterTicketsLocally, niveau, filters.showRejectedByDemandeur]);

  // Calcul du nombre de rapports non lus
  const totalUnreadReports = useMemo(() => {
    if (!filteredTickets || !user) return 0;
    return filteredTickets.filter(ticket => 
      ticket.Id_Demandeur === user.id && 
      ticket.reports && 
      ticket.reports.some(r => !r.is_viewed)
    ).length;
  }, [filteredTickets, user]);

  // Effet pour synchroniser le filtre titre avec debounce
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      titre: debouncedTitleFilter
    }));
  }, [debouncedTitleFilter]);

  // Fonction unique de chargement des tickets
  const fetchTickets = async (pageNum = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      }
      setSpin(true);

      // Créer les filtres sans le titre (géré localement)
      const serverFilters = { ...filters };
      delete serverFilters.titre;

      const response = await axios.get('/api/tickets', {
        params: { 
          ...serverFilters,
          page: pageNum,
          per_page: 2,
          filter_unread_reports: showUnreadReportsOnly ? true : undefined
        }
      });

      const ticketsData = response.data;
      const newTickets = ticketsData.data || [];
      const total = ticketsData.total || 0;
      const lastPage = Math.ceil(total / 2);

      if (pageNum === 1) {
        setAllTickets(newTickets);
      } else {
        setAllTickets(prev => [...prev, ...newTickets]);
      }

      setHasMore(pageNum < lastPage);
      setPage(pageNum);
      setError('');
    } catch (err) {
      setError('Erreur lors du chargement des tickets');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      setSpin(false);
    }
  };

  // Effet pour le chargement initial des options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const optionsResponse = await axios.get('/api/tickets/options');
        if (optionsResponse.data && optionsResponse.data.options) {
          const { options: optionsData } = optionsResponse.data;
          setStatuts(optionsData.statuts || []);
          setCategories(optionsData.categories || []);
          setDemandeurs(optionsData.demandeurs || []);
          setSocietes(optionsData.societes || []);
          setEmplacements(optionsData.emplacements || []);
          setPriorites(optionsData.priorites || []);
          setExecutants(optionsData.executants || []);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des options:', error);
      }
    };
    loadOptions();
  }, []);

  // Effet pour le chargement des tickets quand les filtres changent (sauf titre)
  useEffect(() => {
    fetchTickets(1);
  }, [
    filters.categorie,
    filters.demandeur,
    filters.societe,
    filters.emplacement,
    filters.statut,
    filters.priorite,
    filters.executant,
    filters.dateDebut,
    filters.dateDebutFin,
    filters.dateFinPrevueDebut,
    filters.dateFinPrevueFin,
    filters.dateFinReelleDebut,
    filters.dateFinReelleFin,
    filters.type_demande,
    debouncedTitleFilter, // Seulement quand le titre debounce change
    showUnreadReportsOnly
  ]);

  // Effet pour l'intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading) {
          setIsLoadingMore(true);
          fetchTickets(page + 1);
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '500px'
      }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoadingMore, page, loading]);

  // Effet pour écouter les événements de rapports marqués comme lus
  useEffect(() => {
    const handleReportsViewed = (event) => {
      const { ticketId } = event.detail;
      setAllTickets(prevTickets => 
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

  // Fonction pour gérer le changement de filtre
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Fonction pour gérer le changement du titre
  const handleTitleFilterChange = (value) => {
    setLocalTitleFilter(value);
  };

  // Fonction pour gérer le clic sur les boutons de statut
  const handleStatutButtonClick = (statutId) => {
    const newStatut = filters.statut === statutId ? '' : statutId;
    handleFilterChange('statut', newStatut);
    
    const newSearchParams = new URLSearchParams(searchParams);
    if (newStatut !== '') {
      newSearchParams.set('statut', newStatut.toString());
    } else {
      newSearchParams.delete('statut');
    }
    window.history.replaceState(null, '', `?${newSearchParams.toString()}`);
  };

  // Fonction pour gérer le changement de statut d'un ticket
  const handleStatutChange = async (ticketId, newStatutId) => {
    try {
      const selectedStatut = statuts.find(s => s.id === parseInt(newStatutId, 10));
      const isCloture = selectedStatut?.designation === 'Clôturé';

      const updateData = {
        Id_Statut: parseInt(newStatutId, 10)
      };

      if (isCloture) {
        updateData.DateFinReelle = new Date().toISOString().split('T')[0];
      }

      const response = await axios.put(`/api/tickets/${ticketId}`, updateData);

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

    } catch (error) {
      console.error('Error updating status:', error);
      setError(error.response?.data?.message || 'Erreur lors de la mise à jour du statut du ticket.');
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
      type_demande: '',
      titre: '',
      showRejectedByDemandeur: false
    });
    setLocalTitleFilter('');
    setShowUnreadReportsOnly(false);
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '-';
    let dateString = dateValue;
    if (typeof dateValue === 'object' && dateValue.date) {
      dateString = dateValue.date;
    }
    if (typeof dateString === 'string' && dateString.includes('.')) {
      dateString = dateString.split('.')[0];
    }
    const isoString = dateString.replace(' ', 'T');
    const date = new Date(isoString);
    return isNaN(date) ? '-' : date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (loading && !allTickets.length) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Liste des Tickets</h1>
          </div>
          <div className="animate-pulse">
            <div className="h-24 bg-gray-200 rounded mb-4"></div>
            <div className="h-24 bg-gray-200 rounded mb-4"></div>
            <div className="h-24 bg-gray-200 rounded mb-4"></div>
          </div>
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
              onClick={() => fetchTickets(1)}
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
            {/* Bouton pour les tickets refusés par le demandeur */}
            {(niveau === '1' || niveau === 1) && (
              <button
                onClick={() => setFilters(prev => ({
                  ...prev,
                  showRejectedByDemandeur: !prev.showRejectedByDemandeur,
                  statut: !prev.showRejectedByDemandeur ? '' : prev.statut
                }))}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                  filters.showRejectedByDemandeur
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>Tickets refusés par le demandeur</span>
                {rejectedTicketsCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold bg-red-600 text-white rounded-full">
                    {rejectedTicketsCount}
                  </span>
                )}
              </button>
            )}
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
                  value={localTitleFilter}
                  onChange={e => handleTitleFilterChange(e.target.value)}
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

        {!loading && filteredTickets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24">
            <span className="text-2xl font-semibold text-gray-400 mb-2">Pas de ticket</span>
            <span className="text-base text-gray-400">Aucun ticket ne correspond à vos critères de recherche.</span>
          </div>
        )}

        <div className="space-y-4">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`rounded-2xl shadow-lg border flex flex-col md:flex-row items-center justify-between min-h-[140px] px-6 py-5 mb-6 transition-transform hover:scale-[1.015] hover:shadow-2xl group
                ${ticket.reports && ticket.reports.some(report => report.type === 'rejet' && report.Id_Demandeur === ticket.Id_Demandeur) ? 'border-red-600 bg-red-50' : ''}
              `}
              style={{ transition: 'box-shadow 0.2s, transform 0.2s' }}
            >
              <div className="flex-1 flex flex-col w-full">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className={`text-2xl font-bold uppercase tracking-wide group-hover:text-blue-700 transition-colors ${
                      ticket.reports && ticket.reports.some(report => report.type === 'rejet' && report.Id_Demandeur === ticket.Id_Demandeur) ? 'text-red-700' : 'text-gray-900'
                    }`}>
                      {ticket.Titre}
                    </h3>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                        {ticket.statut?.designation || 'Sans statut'}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 border border-green-200">
                        {ticket.priorite?.designation || 'Sans priorité'}
                      </span>
                      {ticket.statut?.designation === 'Clôturé' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-gray-700 border border-gray-200">
                          Clôturé le : {formatDate(ticket.DateFinReelle)}
                        </span>
                      )}
                      {ticket.reports && ticket.reports.some(report => report.type === 'rejet' && report.Id_Demandeur === ticket.Id_Demandeur) && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700 border border-red-200">
                          Refusé par le demandeur
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
                {(niveau === '1' || niveau === 1) && (
                  <select
                    value={ticket.Id_Statut}
                    onChange={e => handleStatutChange(ticket.id, e.target.value)}
                    className="mb-2 px-2 py-1 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
          
          {hasMore && (
            <div ref={observerTarget} className="h-16 flex items-center justify-center">
              {isLoadingMore ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-500">Chargement...</span>
                </div>
              ) : (
                <div className="h-4"></div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TicketList;