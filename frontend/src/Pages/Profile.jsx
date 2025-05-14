import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import Layout from '../components/Layout';
import { FaUser, FaEnvelope, FaUserShield, FaClock } from 'react-icons/fa';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const getNiveauText = (niveau) => {
    if (!niveau) return 'Non spécifié';
    
    const niveauMap = {
      '1': 'Administrateur',
      '2': 'Responsable'
    };
    
    return niveauMap[niveau] || 'Non spécifié';
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await axios.get('/api/user');
        console.log('Réponse API:', response.data);
        setUser(response.data);
        setError('');
      } catch (err) {
        setError('Erreur lors du chargement du profil');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const renderSkeleton = () => (
    <div className="animate-pulse">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold mb-8">Mon Profil</h1>
          {renderSkeleton()}
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-8">Mon Profil</h1>

        {success && (
          <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
            {success}
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Informations du profil
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <FaUser className="mr-2" /> Nom complet
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {user?.designation || 'Non spécifié'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <FaEnvelope className="mr-2" /> Email
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {user?.email || 'Non spécifié'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <FaUserShield className="mr-2" /> Niveau d'accès
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {getNiveauText(user?.niveau)}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <FaClock className="mr-2" /> Statut
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Actif
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile; 