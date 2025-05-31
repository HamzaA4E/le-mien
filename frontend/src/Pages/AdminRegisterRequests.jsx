import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import Layout from '../components/Layout';
import { FaEye, FaCheck, FaTimes, FaSearch, FaFilter, FaSyncAlt } from 'react-icons/fa';

const AdminRegisterRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [spin, setSpin] = useState(false);

  useEffect(() => {
    // Vérifier le niveau d'accès
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.niveau !== 1) {
      navigate('/unauthorized');
      return;
    }

    fetchRequests();
  }, [navigate]);

  const fetchRequests = async () => {
    try {
      setSpin(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/register-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      setRequests(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Erreur lors du chargement des demandes');
      setLoading(false);
    } finally {
      setTimeout(() => setSpin(false), 600);
    }
  };

  const handleApprove = async (id) => {
    setSelectedRequest(requests.find(req => req.id === id));
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async () => {
    if (password !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères');
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
      setShowPasswordModal(false);
      setPassword('');
      setConfirmPassword('');
      setPasswordError('');
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Erreur lors de l\'approbation de la demande');
    }
  };

  const handleReject = async (id) => {
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
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setOpenDialog(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'approved':
        return 'Approuvé';
      case 'rejected':
        return 'Rejeté';
      default:
        return status;
    }
  };

  const formatLevel = (level) => {
    if (level === 'directeur_general') {
      return 'Directeur General';
    }
    return level.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.service?.designation?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                onChange={(e) => setSearchTerm(e.target.value)}
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
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="approved">Approuvé</option>
                <option value="rejected">Rejeté</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tableau des demandes */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom complet</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Niveau</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date de demande</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">{request.full_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">{request.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{formatLevel(request.level)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">
                      {request.level === 'directeur_general' ? '-' : (request.service?.designation || 'N/A')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetails(request)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Voir les détails"
                        >
                          <FaEye className="h-5 w-5" />
                        </button>
                        {request.status === 'pending' && (
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
                  onClick={() => setOpenDialog(false)}
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
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                {selectedRequest.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleApprove(selectedRequest.id);
                        setOpenDialog(false);
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => {
                        handleReject(selectedRequest.id);
                        setOpenDialog(false);
                      }}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                    >
                      Rejeter
                    </button>
                  </>
                )}
                <button
                  onClick={() => setOpenDialog(false)}
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
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }}
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
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }}
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