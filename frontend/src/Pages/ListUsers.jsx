import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { FaUser, FaEnvelope, FaUserShield, FaClock, FaEdit, FaTrash, FaSyncAlt, FaExclamationTriangle } from 'react-icons/fa';

// Cache pour les utilisateurs
const userCache = {
  users: null,
  lastFetch: null,
  cacheDuration: 5 * 60 * 1000 // 5 minutes
};

const ListUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [spin, setSpin] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Récupérer le user courant
  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem('user'));
  } catch (e) {
    currentUser = null;
  }

  const getNiveauText = (niveau) => {
    if (!niveau) return 'Non spécifié';
    
    const niveauMap = {
      '1': 'Administrateur',
      '2': 'Directeur Général',
      '3': 'Directeur Département',
      '4': 'Demandeur'
    };
    
    return niveauMap[niveau] || 'Non spécifié';
  };

  const getStatusBadge = () => {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Actif
      </span>
    );
  };

  const fetchUsers = async (force = false) => {
    setSpin(true);
    if (userCache.users && userCache.lastFetch && !force) {
      const now = new Date().getTime();
      if (now - userCache.lastFetch < userCache.cacheDuration) {
        setUsers(userCache.users);
        setLoading(false);
        setSpin(false);
        return;
      }
    }
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
      userCache.users = response.data;
      userCache.lastFetch = new Date().getTime();
      setError('');
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setSpin(false), 600);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (userId) => {
    setUserToDelete(userId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/users/${userToDelete}`);
      const updatedUsers = users.filter(user => user.id !== userToDelete);
      setUsers(updatedUsers);
      userCache.users = updatedUsers;
      setSuccess('Utilisateur supprimé avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erreur lors de la suppression de l\'utilisateur');
      console.error('Erreur:', err);
    } finally {
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const handleSetStatut = async (id, statut) => {
    try {
      setSpin(true);
      await axios.patch(`/api/utilisateurs/${id}/statut`, { statut });
      await fetchUsers(true);
      setSuccess(statut === 1 ? 'Utilisateur activé avec succès' : 'Utilisateur désactivé avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erreur lors du changement de statut');
      console.error('Erreur:', err);
    } finally {
      setTimeout(() => setSpin(false), 600);
    }
  };

  const renderSkeleton = () => (
    <div className="animate-pulse">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold mb-8">Liste des Utilisateurs</h1>
          {renderSkeleton()}
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-9">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Liste des Utilisateurs</h1>
          <button
            onClick={() => {
              setSpin(true);
              fetchUsers(true);
            }}
            className="ml-4 p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-blue-600 transition"
            title="Rafraîchir"
          >
            <FaSyncAlt className={spin ? 'animate-spin-once' : ''} />
          </button>
        </div>

        {success && (
          <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
            {success}
          </div>
        )}

        {/* Modal de confirmation de suppression */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <FaExclamationTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Confirmation de suppression</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
                  </p>
                </div>
                <div className="items-center px-4 py-3">
                  <button
                    onClick={confirmDelete}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Supprimer
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setUserToDelete(null);
                    }}
                    className="mt-3 px-4 py-2 bg-gray-100 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    Utilisateur
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                    Email
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    Niveau d'accès
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    Service
                  </th>
                  <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/10">
                    Statut
                  </th>
                  <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-3 py-3">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <FaUser className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="ml-2">
                          <div className="text-sm font-medium text-gray-900">
                            {user.designation}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm text-gray-900">{getNiveauText(user.niveau)}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm text-gray-900">
                        {user.niveau === '2' ? 'Pas de service' : (user.service?.designation || 'Non spécifié')}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {user.statut === 1 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2 gap-2">
                        {currentUser?.niveau === 1 && user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleSetStatut(user.id, user.statut === 1 ? 0 : 1)}
                            className={user.statut === 1 ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                          >
                            {user.statut === 1 ? 'Désactiver' : 'Activer'}
                          </button>
                        )}
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ListUsers; 