import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { Link, useSearchParams } from 'react-router-dom';
import { FaSyncAlt, FaFilter, FaTimes } from 'react-icons/fa';
import { BiCategory } from 'react-icons/bi';
import { MdPerson, MdBusinessCenter, MdLocationOn, MdDateRange } from 'react-icons/md';
import { toast, Toaster } from 'react-hot-toast';



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
  const [emplacements, setEmplacements] = useState([]);
  const [priorites, setPriorites] = useState([]);
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

  // Calcul du nombre de tickets refusés par le demandeur pour l'exécutant
  const rejectedTicketsCount = useMemo(() => {
    if (!allTickets) return 0;
    // Admin
    if (niveau === '1' || niveau === 1) {
      return allTickets.filter(ticket => 
        ticket.reports && 
        ticket.reports.some(report => 
          report.type === 'rejet' && (
            report.Id_Demandeur === ticket.id_demandeur
          )
        ) &&
        (ticket.statut?.designation === 'En instance')
      ).length;
    }
    // Executant
    if (niveau === '4' || niveau === 4 || niveau === '5' || niveau === 5) {
      return allTickets.filter(ticket => 
        ticket.executant?.designation === user?.designation &&
        ticket.reports &&
        ticket.reports.some(report => 
          report.type === 'rejet' && (
            report.Id_Demandeur === ticket.id_demandeur
          )
        ) &&
        (ticket.statut?.designation === 'En instance')
      ).length;
    }
    return 0;
  }, [allTickets, niveau, user]);

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
        filtered = filtered.filter(ticket => 
          ticket.reports &&
          ticket.reports.some(report =>
            report.type === 'rejet' && (
              report.Id_Demandeur === ticket.id_demandeur
            )
          )
        );
      }
    }
    if (niveau === '4' || niveau === 4 || niveau === '5' || niveau === 5) {
      if (filters.showRejectedByDemandeur) {
        filtered = filtered.filter(ticket => 
          ticket.executant?.designation === user?.designation &&
          ticket.reports &&
          ticket.reports.some(report =>
            report.type === 'rejet' && (
              report.Id_Demandeur === ticket.id_demandeur
            )
          )
        );
      }
    }

    return filtered;
  }, [allTickets, localTitleFilter, filterTicketsLocally, niveau, filters.showRejectedByDemandeur, user]);

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

  // Effet pour le chargement initial des options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoading(true);
        const optionsResponse = await axios.get('/api/tickets/options');
        if (optionsResponse.data && optionsResponse.data.options) {
          const { options: optionsData } = optionsResponse.data;
          setStatuts(optionsData.statuts || []);
          setCategories(optionsData.categories || []);
          setDemandeurs(optionsData.demandeurs || []);
          setEmplacements(optionsData.emplacements || []);
          setPriorites(optionsData.priorites || []);
        }
        // Une fois les options chargées, on charge les tickets
        await fetchTickets(1);
      } catch (error) {
        console.error('Erreur lors du chargement des options:', error);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    loadOptions();
  }, []); // Dépendances vides pour ne s'exécuter qu'une fois au montage

  // Effet pour le chargement des tickets quand les filtres changent
  useEffect(() => {
    // Réinitialiser la page à 1 et les tickets quand les filtres changent
    setPage(1);
    setAllTickets([]);
    setHasMore(true);
    
    // On ne recharge les tickets que si ce n'est pas le chargement initial
    if (!loading) {
      const timer = setTimeout(() => {
        fetchTickets(1);
      }, 300); // Petit délai pour éviter les appels multiples rapides
      return () => clearTimeout(timer);
    }
  }, [
    filters.categorie,
    filters.demandeur,
    filters.emplacement,
    filters.statut,
    filters.priorite,
    filters.dateDebut,
    filters.dateDebutFin,
    filters.dateFinPrevueDebut,
    filters.dateFinPrevueFin,
    filters.dateFinReelleDebut,
    filters.dateFinReelleFin,
    debouncedTitleFilter,
    showUnreadReportsOnly
  ]);

  // Fonction unique de chargement des tickets
  const fetchTickets = async (pageNum = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
        setAllTickets([]); // Réinitialiser les tickets au début du chargement
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
      // En cas d'erreur, réinitialiser l'état
      setAllTickets([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      setSpin(false);
    }
  };

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
      
      // Vérifier si le statut est l'un des statuts manuels autorisés
      const manualStatuses = ['En instance', 'En cours', 'Terminé'];
      const isManualStatus = manualStatuses.includes(selectedStatut?.designation);

      // Si ce n'est pas un statut manuel et que l'utilisateur n'est pas admin, empêcher le changement
      if (!isManualStatus && !(niveau === '1' || niveau === 1)) {
        toast.error('Vous ne pouvez pas modifier ce statut.');
        return;
      }

      const updateData = {
        Id_Statut: parseInt(newStatutId, 10)
      };

      // Si le statut est "Terminé", ajouter la date de fin réelle
      if (selectedStatut?.designation === 'Terminé') {
        updateData.DateFinReelle = new Date().toISOString().split('T')[0];
      }

      const response = await axios.put(`/api/tickets/${ticketId}`, updateData);

      setAllTickets(prevTickets => prevTickets.map(ticket => {
        if (ticket.id === ticketId) {
          return {
            ...ticket,
            Id_Statut: parseInt(newStatutId, 10),
            statut: response.data.statut,
            DateFinReelle: selectedStatut?.designation === 'Terminé' ? updateData.DateFinReelle : ticket.DateFinReelle
          };
        }
        return ticket;
      }));

      toast.success('Statut mis à jour avec succès');

    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Erreur lors de la mise à jour du statut du ticket.');
    }
  };

  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    setFilters({
      categorie: '',
      demandeur: '',
      emplacement: '',
      statut: '',
      priorite: '',
      dateDebut: '',
      dateDebutFin: '',
      dateFinPrevueDebut: '',
      dateFinPrevueFin: '',
      dateFinReelleDebut: '',
      dateFinReelleFin: '',
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
        <Toaster position="top-right" />
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
      <Toaster position="top-right" />
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
            {(niveau === '1' || niveau === 1 || niveau === '4' || niveau === 4 || niveau === '5' || niveau === 5) && (
              <button
                onClick={() => setFilters(prev => ({
                  ...prev,
                  showRejectedByDemandeur: !prev.showRejectedByDemandeur,
                  statut: !prev.showRejectedByDemandeur ? '' : prev.statut
                }))}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                  filters.showRejectedByDemandeur
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>Tickets refusés par le demandeur</span>
                {rejectedTicketsCount > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold bg-purple-600 text-white rounded-full">
                    {rejectedTicketsCount}
                  </span>
                )}
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
          {filteredTickets.map((ticket, index) => {
            // Affichage temporaire pour debug
            console.log('TICKET DEBUG:', ticket.id, ticket.Titre, ticket.reports, ticket.Id_Demandeur);
            // Vérifier si le ticket est refusé par le demandeur
            const isRejectedByDemandeur = ticket.reports && 
              ticket.reports.some(report => 
                report.type === 'rejet' && 
                (
                  (report.Id_Demandeur === ticket.id_demandeur) 
                )
              );
            
            // Déterminer la classe de style en fonction du statut
            const getTicketStyle = () => {
              if (ticket.statut?.designation === 'Refusé') {
                return 'border-red-600 bg-red-100 hover:bg-red-200';
              }
              if (isRejectedByDemandeur) {
                return 'border-purple-600 bg-purple-100 hover:bg-purple-200';
              }
              return '';
            };

            const ticketStyle = getTicketStyle();

            // TEST : injecter un faux report pour le ticket id=1
            if (ticket.id === 1) {
              ticket.reports = [{ type: 'rejet', Id_Demandeur: ticket.Id_Demandeur }];
            }

            return (
              <div
                key={`ticket-${ticket.id}-${index}`}
                className={`rounded-2xl shadow-lg border flex flex-col md:flex-row items-center justify-between min-h-[140px] px-6 py-5 mb-6 transition-transform hover:scale-[1.015] hover:shadow-2xl group ${ticketStyle}`}
                style={{ transition: 'box-shadow 0.2s, transform 0.2s' }}
              >
                <div className="flex-1 flex flex-col w-full">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className={`text-2xl font-bold uppercase tracking-wide group-hover:text-blue-700 transition-colors ${
                        ticket.statut?.designation === 'Refusé' ? 'text-red-700' : 
                        isRejectedByDemandeur ? 'text-purple-700' : 
                        'text-gray-900'
                      }`}>
                        {ticket.Titre}
                      </h3>
                      <div className="flex gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${
                          ticket.statut?.designation === 'Refusé' ? 'bg-red-100 text-red-700 border-red-200' :
                          isRejectedByDemandeur ? 'bg-purple-100 text-purple-700 border-purple-200' :
                          'bg-blue-100 text-blue-700 border-blue-200'
                        }`}>
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
                        {isRejectedByDemandeur && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                            Refusé précédemment par le demandeur
                          </span>
                        )}
                      </div>
                    </div>
                    <p className={`text-base mb-4 line-clamp-2 ${
                      ticket.statut?.designation === 'Refusé' ? 'text-red-700' : 
                      isRejectedByDemandeur ? 'text-purple-700' : 
                      'text-gray-700'
                    }`}>
                      {ticket.Description || 'Aucune description'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                      <div>
                        <span className="text-gray-500">Demandeur :</span>
                        <span className="font-semibold text-gray-900 ml-1">{ticket.demandeur?.designation}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Catégorie :</span>
                        <span className="font-semibold text-gray-900 ml-1">{ticket.categorie?.designation || 'Non spécifiée'}</span>
                      </div>
                      {ticket.DateDebut && (
                        <div>
                          <span className="text-gray-500">Date début :</span>
                          <span className="font-semibold text-gray-900 ml-1">{formatDate(ticket.DateDebut)}</span>
                        </div>
                      )}
                      {ticket.DateFinPrevue && (
                        <div>
                          <span className="text-gray-500">Date fin prévue :</span>
                          <span className="font-semibold text-gray-900 ml-1">{formatDate(ticket.DateFinPrevue)}</span>
                        </div>
                      )}
                      {ticket.statut?.designation === 'Refusé' && (
                        <div className="md:col-span-2">
                          <span className="text-gray-500">Raison du refus :</span>
                          <span className="font-semibold text-gray-900 ml-1">
                            {ticket.reports?.findLast(report => report.type === 'rejet')?.Raison || 'Non spécifiée'}
                          </span>
                        </div>
                      )}
                      {isRejectedByDemandeur && (
                        <div className="md:col-span-2">
                          <span className="text-gray-500">Raison du refus par le demandeur :</span>
                          <span className="font-semibold text-gray-900 ml-1">
                            {ticket.reports?.findLast(report => 
                              report.type === 'rejet' && 
                              (
                                (report.Id_Demandeur === ticket.Id_Demandeur) ||
                                (report.id_demandeur === ticket.Id_Demandeur) ||
                                (report.Id_Demandeur === ticket.id_demandeur) ||
                                (report.id_demandeur === ticket.id_demandeur)
                              )
                            )?.Raison || 'Non spécifiée'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                    <MdPerson className="mr-1" />
                    <span>Exécutant: {ticket.executant?.nom || ticket.executant?.designation || 'Non assigné'}</span>
                  </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 md:mt-0 md:ml-6 flex-shrink-0 flex flex-col items-end justify-between h-full gap-2">
                  {(niveau === '1' || niveau === 1) ? (
                    // ADMIN : peut tout changer
                    <>
                      {['En instance', 'En cours', 'Terminé'].includes(ticket.statut?.designation) ? (
                        <select
                          value={ticket.Id_Statut}
                          onChange={e => handleStatutChange(ticket.id, e.target.value)}
                          className={`mb-2 px-2 py-1 rounded border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                            ticket.statut?.designation === 'Refusé' ? 'border-red-300 bg-red-50' :
                            isRejectedByDemandeur ? 'border-purple-300 bg-purple-50' :
                            'border-gray-300'
                          }`}
                        >
                          {statuts && statuts.length > 0 ? (
                            (() => {
                              const statutOrder = ['En instance', 'En cours', 'Terminé'];
                              const statutsTries = statuts
                                .filter(s => statutOrder.includes(s.designation))
                                .sort((a, b) => statutOrder.indexOf(a.designation) - statutOrder.indexOf(b.designation));
                              return statutsTries.map(s => (
                                <option key={s.id} value={s.id}>{s.designation}</option>
                              ));
                            })()
                          ) : (
                            <option value="">Chargement des statuts...</option>
                          )}
                        </select>
                      ) : (
                        <div className={`mb-2 px-2 py-1 text-sm ${
                          ticket.statut?.designation === 'Refusé' ? 'text-red-700' :
                          isRejectedByDemandeur ? 'text-purple-700' :
                          'text-gray-700'
                        }`}>
                          Statut : {ticket.statut?.designation || 'Non défini'}
                        </div>
                      )}
                    </>
                  ) : (niveau === '5' || niveau === 5) && ticket.executant?.designation === user?.designation ? (
                    // EXECUTANT : peut changer le statut de ses propres tickets
                    <>
                      {['En instance', 'En cours', 'Terminé'].includes(ticket.statut?.designation) ? (
                        <select
                          value={ticket.Id_Statut}
                          onChange={e => handleStatutChange(ticket.id, e.target.value)}
                          className={`mb-2 px-2 py-1 rounded border text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                            ticket.statut?.designation === 'Refusé' ? 'border-red-300 bg-red-50' :
                            isRejectedByDemandeur ? 'border-purple-300 bg-purple-50' :
                            'border-gray-300'
                          }`}
                        >
                          {statuts && statuts.length > 0 ? (
                            (() => {
                              const statutOrder = ['En instance', 'En cours', 'Terminé'];
                              const statutsTries = statuts
                                .filter(s => statutOrder.includes(s.designation))
                                .sort((a, b) => statutOrder.indexOf(a.designation) - statutOrder.indexOf(b.designation));
                              return statutsTries.map(s => (
                                <option key={s.id} value={s.id}>{s.designation}</option>
                              ));
                            })()
                          ) : (
                            <option value="">Chargement des statuts...</option>
                          )}
                        </select>
                      ) : (
                        <div className={`mb-2 px-2 py-1 text-sm ${
                          ticket.statut?.designation === 'Refusé' ? 'text-red-700' :
                          isRejectedByDemandeur ? 'text-purple-700' :
                          'text-gray-700'
                        }`}>
                          Statut : {ticket.statut?.designation || 'Non défini'}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={`mb-2 px-2 py-1 text-sm ${
                      ticket.statut?.designation === 'Refusé' ? 'text-red-700' :
                      isRejectedByDemandeur ? 'text-purple-700' :
                      'text-gray-700'
                    }`}>
                      Statut : {ticket.statut?.designation || 'Non défini'}
                    </div>
                  )}
                  
                  <Link
                    to={`/tickets/${ticket.id}`}
                    className={`inline-flex items-center gap-2 text-white font-semibold px-5 py-2 rounded-lg shadow transition-colors text-base ${
                      ticket.statut?.designation === 'Refusé' ? 'bg-red-600 hover:bg-red-700' :
                      isRejectedByDemandeur ? 'bg-purple-600 hover:bg-purple-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' /></svg>
                    Voir détails
                  </Link>
                </div>
              </div>
            );
          })}
          
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