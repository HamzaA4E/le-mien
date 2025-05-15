import React, { useState, useEffect, useMemo } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import { FaSyncAlt, FaFilter, FaTimes } from 'react-icons/fa';
import { BiCategory } from 'react-icons/bi';
import { MdPerson, MdBusinessCenter, MdLocationOn, MdDateRange } from 'react-icons/md';

const STATUTS = [
  { id: 1, label: 'En instance' },
  { id: 2, label: 'En cours' },
  { id: 3, label: 'Clôturé' },
];

// Cache pour les tickets et les filtres
const ticketCache = {
  tickets: null,
  lastFetch: null,
  cacheDuration: 5 * 60 * 1000 // 5 minutes
};
const filterCache = {
  categories: null,
  categoriesLastFetch: null,
  demandeurs: null,
  demandeursLastFetch: null,
  societes: null,
  societesLastFetch: null,
  emplacements: null,
  emplacementsLastFetch: null,
  statuts: null,
  statutsLastFetch: null,
  priorites: null,
  prioritesLastFetch: null,
};

const TicketList = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [updating, setUpdating] = useState({});
  const [statuts, setStatuts] = useState([]);
  const [spin, setSpin] = useState(false);
  
  // États pour les filtres
  const [filters, setFilters] = useState({
    categorie: '',
    demandeur: '',
    societe: '',
    emplacement: '',
    statut: '',
    priorite: '',
    dateDebut: '',
    dateDebutFin: '',
    dateFinPrevueDebut: '',
    dateFinPrevueFin: '',
    dateFinReelleDebut: '',
    dateFinReelleFin: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const [demandeurs, setDemandeurs] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [emplacements, setEmplacements] = useState([]);
  const [priorites, setPriorites] = useState([]);

  // Récupérer le user depuis le localStorage
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch (e) {
    user = null;
  }
  const niveau = user?.niveau;

  const fetchTickets = async (force = false, pageNum = page) => {
    setSpin(true);
    try {
      if (!force && ticketCache.tickets && ticketCache.lastFetch) {
        const now = new Date().getTime();
        if (now - ticketCache.lastFetch < ticketCache.cacheDuration) {
          setTickets(ticketCache.tickets);
          setLoading(false);
          setSpin(false);
          return;
        }
      }

      const response = await axios.get(`/api/tickets`, {
        params: {
          page: pageNum,
          per_page: itemsPerPage,
          ...filters // Envoyer les filtres au backend
        }
      });

      const newTickets = response.data.data || [];
      const total = response.data.total || 0;
      const lastPage = response.data.last_page || 1;

      if (pageNum === 1) {
      ticketCache.tickets = newTickets;
      ticketCache.lastFetch = new Date().getTime();
      setTickets(newTickets);
      } else {
        setTickets(prev => [...prev, ...newTickets]);
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
      setStatuts(response.data);
    } catch (err) {
      console.error('Erreur lors du chargement des statuts:', err);
    }
  };

  const handleStatutChange = async (ticketId, newStatutId) => {
    if (!newStatutId) return; // Ne rien faire si aucun statut n'est sélectionné
    
    setUpdating((prev) => ({ ...prev, [ticketId]: true }));
    try {
      // Chercher la désignation du statut sélectionné
      const statutCloture = statuts.find(s => s.designation === 'Clôturé');
      const isCloture = statutCloture && String(statutCloture.id) === String(newStatutId);

      const payload = { id_statut: newStatutId };
      if (isCloture) {
        payload.DateFinReelle = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }

      console.log('Envoi de la requête de mise à jour:', {
        ticketId,
        newStatutId,
        url: `/api/tickets/${ticketId}`,
        data: payload
      });

      const response = await axios.put(`/api/tickets/${ticketId}`, payload);
      
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

  // Fonction pour récupérer les données des filtres avec cache
  const fetchFilterData = async () => {
    const now = new Date().getTime();
    try {
      // Catégories
      if (filterCache.categories && filterCache.categoriesLastFetch && (now - filterCache.categoriesLastFetch < ticketCache.cacheDuration)) {
        setCategories(filterCache.categories);
      } else {
        const categoriesRes = await axios.get('/api/categories');
        setCategories(categoriesRes.data);
        filterCache.categories = categoriesRes.data;
        filterCache.categoriesLastFetch = now;
      }
      // Demandeurs
      if (filterCache.demandeurs && filterCache.demandeursLastFetch && (now - filterCache.demandeursLastFetch < ticketCache.cacheDuration)) {
        setDemandeurs(filterCache.demandeurs);
      } else {
        const demandeursRes = await axios.get('/api/demandeurs');
        setDemandeurs(demandeursRes.data);
        filterCache.demandeurs = demandeursRes.data;
        filterCache.demandeursLastFetch = now;
      }
      // Sociétés
      if (filterCache.societes && filterCache.societesLastFetch && (now - filterCache.societesLastFetch < ticketCache.cacheDuration)) {
        setSocietes(filterCache.societes);
      } else {
        const societesRes = await axios.get('/api/societes');
        setSocietes(societesRes.data);
        filterCache.societes = societesRes.data;
        filterCache.societesLastFetch = now;
      }
      // Emplacements
      if (filterCache.emplacements && filterCache.emplacementsLastFetch && (now - filterCache.emplacementsLastFetch < ticketCache.cacheDuration)) {
        setEmplacements(filterCache.emplacements);
      } else {
        const emplacementsRes = await axios.get('/api/emplacements');
        setEmplacements(emplacementsRes.data);
        filterCache.emplacements = emplacementsRes.data;
        filterCache.emplacementsLastFetch = now;
      }
      // Statuts
      if (filterCache.statuts && filterCache.statutsLastFetch && (now - filterCache.statutsLastFetch < ticketCache.cacheDuration)) {
        setStatuts(filterCache.statuts);
      } else {
        const statutsRes = await axios.get('/api/statuts');
        setStatuts(statutsRes.data);
        filterCache.statuts = statutsRes.data;
        filterCache.statutsLastFetch = now;
      }
      // Priorités
      if (filterCache.priorites && filterCache.prioritesLastFetch && (now - filterCache.prioritesLastFetch < ticketCache.cacheDuration)) {
        setPriorites(filterCache.priorites);
      } else {
        const prioritesRes = await axios.get('/api/priorites');
        setPriorites(prioritesRes.data);
        filterCache.priorites = prioritesRes.data;
        filterCache.prioritesLastFetch = now;
      }
    } catch (err) {
      console.error('Erreur lors du chargement des données de filtrage:', err);
    }
  };

  const loadMore = () => {
    if (page < totalPages && !isLoadingMore) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
      fetchTickets(false, page + 1);
    }
  };

  // Optimiser le filtrage en le déléguant au backend
  useEffect(() => {
    setPage(1);
    fetchTickets(true, 1);
  }, [filters]);

  useEffect(() => {
    fetchTickets();
    fetchStatuts();
    fetchFilterData();
  }, []);

  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    setFilters({
      categorie: '',
      demandeur: '',
      societe: '',
      emplacement: '',
      statut: '',
      priorite: '',
      dateDebut: '',
      dateDebutFin: '',
      dateFinPrevueDebut: '',
      dateFinPrevueFin: '',
      dateFinReelleDebut: '',
      dateFinReelleFin: ''
    });
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
      // Filtres non-date
      const baseFilters = (
        (!filters.categorie || String(ticket.Id_Categorie) === String(filters.categorie)) &&
        (!filters.demandeur || String(ticket.Id_Demandeur) === String(filters.demandeur)) &&
        (!filters.societe || String(ticket.Id_Societe) === String(filters.societe)) &&
        (!filters.emplacement || String(ticket.Id_Emplacement) === String(filters.emplacement)) &&
        (!filters.statut || String(ticket.Id_Statut) === String(filters.statut)) &&
        (!filters.priorite || String(ticket.Id_Priorite) === String(filters.priorite))
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
                to="/tickets/create"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Créer un ticket
              </Link>
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
              {/* Service (si disponible dans les objets demandeur) */}
              <div className="flex flex-col w-full gap-2">
                <label className="text-sm font-medium text-gray-700">Service</label>
                <select
                  value={filters.service || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, service: e.target.value }))}
                  className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Tous</option>
                  {/* Extraire dynamiquement les services uniques à partir des demandeurs */}
                  {Array.from(new Set(demandeurs.map(dem => dem.id_service)))
                    .filter(id_service => id_service)
                    .map(id_service => (
                      <option key={id_service} value={id_service}>Service {id_service}</option>
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
              {/* Statut */}
              <div className="flex flex-col w-full gap-2">
                <label className="text-sm font-medium text-gray-700">Statut</label>
                <select
                  value={filters.statut}
                  onChange={(e) => setFilters(prev => ({ ...prev, statut: e.target.value }))}
                  className="form-select block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Tous</option>
                  {statuts.map(s => (
                    <option key={s.id} value={s.id}>{s.designation}</option>
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
                      <h3 className="text-2xl font-bold text-gray-900 mb-1 uppercase tracking-wide group-hover:text-blue-700 transition-colors">
                        {ticket.Titre}
                      </h3>
                      <p className="text-base text-gray-700 mb-4 line-clamp-2">
                        {ticket.Description || 'Aucune description'}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                          {ticket.statut?.designation || 'Sans statut'}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                          {ticket.priorite?.designation || 'Sans priorité'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                        <div>
                          <span className="text-gray-500">Demandeur :</span>
                          <span className="font-semibold text-gray-900 ml-1">{ticket.demandeur?.designation || 'Non spécifié'}</span>
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
                {/* Menu déroulant pour changer le statut (toujours visible) */}
                {statuts.length > 0 && (
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
          
          {!loading && page < totalPages && (
            <div className="flex justify-center mt-4">
              <button
                onClick={loadMore}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Chargement...' : 'Charger plus'}
              </button>
            </div>
          )}
          
          {isLoadingMore && (
            <div className="mt-4">
              {renderTicketSkeleton()}
          </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TicketList; 