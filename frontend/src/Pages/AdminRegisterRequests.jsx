import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';
import { FaEye, FaCheck, FaTimes, FaSearch, FaFilter, FaSyncAlt } from 'react-icons/fa';

// Constantes pour éviter les chaînes de caractères en dur
const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ALL: 'all'
};

const STATUS_LABELS = {
  [STATUS.PENDING]: 'En attente',
  [STATUS.APPROVED]: 'Approuvé',
  [STATUS.REJECTED]: 'Rejeté'
};

const STATUS_COLORS = {
  [STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',
  [STATUS.APPROVED]: 'bg-green-100 text-green-800',
  [STATUS.REJECTED]: 'bg-red-100 text-red-800',
  default: 'bg-gray-100 text-gray-800'
};

const AdminRegisterRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(STATUS.ALL);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [spin, setSpin] = useState(false);
  const abortControllerRef = useRef(null);

  // Vérification du niveau d'accès
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.niveau !== 1) {
      navigate('/unauthorized');
      return;
    }
    fetchRequests();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [navigate]);

  const fetchRequests = useCallback(async () => {
    try {
      setSpin(true);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/register-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: abortControllerRef.current.signal
      });
      setRequests(response.data);
      setLoading(false);
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Request cancelled:', error.message);
      } else {
        console.error('Error fetching requests:', error);
        toast.error('Erreur lors du chargement des demandes');
        setLoading(false);
      }
    } finally {
      setTimeout(() => setSpin(false), 600);
    }
  }, []);

  const handleApprove = useCallback((id) => {
    const request = requests.find(req => req.id === id);
    if (request) {
      setSelectedRequest(request);
      setShowPasswordModal(true);
    }
  }, [requests]);

  const validatePassword = useCallback((password, confirmPassword) => {
    if (password !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return false;
    }
    if (password.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }
    return true;
  }, []);

  const handlePasswordSubmit = useCallback(async () => {
    if (!validatePassword(password, confirmPassword)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/admin/register-requests/${selectedRequest.id}/approve`, {
        password: password
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      toast.success('Demande approuvée avec succès');
      handleClosePasswordModal();
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Erreur lors de l\'approbation de la demande');
    }
  }, [password, confirmPassword, selectedRequest, fetchRequests, validatePassword]);

  const handleReject = useCallback(async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/admin/register-requests/${id}/reject`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      toast.success('Demande rejetée avec succès');
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Erreur lors du rejet de la demande');
    }
  }, [fetchRequests]);

  const handleViewDetails = useCallback((request) => {
    setSelectedRequest(request);
    setOpenDialog(true);
  }, []);

  const getStatusColor = useCallback((status) => {
    return STATUS_COLORS[status] || STATUS_COLORS.default;
  }, []);

  const getStatusLabel = useCallback((status) => {
    return STATUS_LABELS[status] || status;
  }, []);

  const formatLevel = useCallback((level) => {
    if (level === 'directeur_general') {
      return 'Directeur General';
    }
    return level.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  const filteredRequests = useMemo(() => {
    const searchTermLower = searchTerm.toLowerCase();
    return requests.filter(request => {
      const matchesSearch = 
        request.full_name.toLowerCase().includes(searchTermLower) ||
        request.email.toLowerCase().includes(searchTermLower) ||
        request.service?.designation?.toLowerCase().includes(searchTermLower);
      
      const matchesStatus = statusFilter === STATUS.ALL || request.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [requests, searchTerm, statusFilter]);

  const handleClosePasswordModal = useCallback(() => {
    setShowPasswordModal(false);
    setPassword('');
    setConfirmPassword('');
    setPasswordError('');
  }, []);

  const handleCloseDetailsModal = useCallback(() => {
    setOpenDialog(false);
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleStatusFilterChange = useCallback((e) => {
    setStatusFilter(e.target.value);
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-4">
              <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
            <div className="mt-2 h-4 w-96 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Filtres et recherche skeleton */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="w-full sm:w-48">
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>

          {/* Tableau skeleton */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[...Array(7)].map((_, index) => (
                      <th key={index} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...Array(2)].map((_, rowIndex) => (
                    <tr key={rowIndex}>
                      {[...Array(7)].map((_, colIndex) => (
                        <td key={colIndex} className="px-4 py-4">
                          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des demandes d'inscription</h1>
            <button
              onClick={fetchRequests}
              className="p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-blue-600 transition"
              title="Rafraîchir"
            >
              <FaSyncAlt className={spin ? 'animate-spin-once' : ''} />
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Gérez les demandes d'inscription des nouveaux utilisateurs
          </p>
        </div>

        {/* Filtres et recherche */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Rechercher par nom, email ou service..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaFilter className="h-5 w-5 text-gray-400" />
              </div>
              <select
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={statusFilter}
                onChange={handleStatusFilterChange}
              >
                <option value={STATUS.ALL}>Tous les statuts</option>
                <option value={STATUS.PENDING}>En attente</option>
                <option value={STATUS.APPROVED}>Approuvé</option>
                <option value={STATUS.REJECTED}>Rejeté</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tableau des demandes */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[160px] max-w-[260px]">Nom complet</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px] max-w-[260px]">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] max-w-[180px]">Niveau</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px] max-w-[200px]">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px] max-w-[140px]">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px] max-w-[180px]">Date de demande</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] max-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-900 whitespace-normal break-words max-w-[220px] align-top">{request.full_name}</td>
                    <td className="px-4 py-4 text-sm text-gray-900 whitespace-normal break-words max-w-[220px] align-top">{request.email}</td>
                    <td className="px-4 py-4 text-sm text-gray-900 whitespace-normal break-words min-w-[120px] max-w-[180px] align-top">{formatLevel(request.level)}</td>
                    <td className="px-4 py-4 text-sm text-gray-900 whitespace-normal break-words max-w-[180px] align-top">
                      {request.level === 'directeur_general' ? 'Pas de service' : (request.service?.designation || 'N/A')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap min-w-[100px] max-w-[140px] align-top">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 whitespace-nowrap min-w-[140px] max-w-[180px] align-top">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium whitespace-nowrap min-w-[120px] max-w-[140px] align-top">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetails(request)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir les détails"
                        >
                          <FaEye className="h-5 w-5" />
                        </button>
                        {request.status === STATUS.PENDING && (
                          <>
                            <button
                              onClick={() => handleApprove(request.id)}
                              className="text-green-600 hover:text-green-900"
                              title="Approuver"
                            >
                              <FaCheck className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Rejeter"
                            >
                              <FaTimes className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal pour les détails */}
        {openDialog && selectedRequest && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Détails de la demande</h3>
                <button
                  onClick={handleCloseDetailsModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Nom complet</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Niveau</p>
                  <p className="mt-1 text-sm text-gray-900">{formatLevel(selectedRequest.level)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Service</p>
                  <p className="mt-1 text-sm text-gray-900">{selectedRequest.service?.designation || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Statut</p>
                  <p className="mt-1">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedRequest.status)}`}>
                      {getStatusLabel(selectedRequest.status)}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Date de demande</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedRequest.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Date d'action</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {(selectedRequest.status === STATUS.APPROVED || selectedRequest.status === STATUS.REJECTED)
                      ? new Date(selectedRequest.updated_at).toLocaleString()
                      : '-'}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                {selectedRequest.status === STATUS.PENDING && (
                  <>
                    <button
                      onClick={() => {
                        handleApprove(selectedRequest.id);
                        handleCloseDetailsModal();
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => {
                        handleReject(selectedRequest.id);
                        handleCloseDetailsModal();
                      }}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                    >
                      Rejeter
                    </button>
                  </>
                )}
                <button
                  onClick={handleCloseDetailsModal}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal pour le mot de passe */}
        {showPasswordModal && selectedRequest && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Définir le mot de passe</h3>
                <button
                  onClick={handleClosePasswordModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Entrez le mot de passe"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Confirmez le mot de passe"
                  />
                </div>
                {passwordError && (
                  <p className="text-sm text-red-600">{passwordError}</p>
                )}
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={handleClosePasswordModal}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handlePasswordSubmit}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminRegisterRequests; 