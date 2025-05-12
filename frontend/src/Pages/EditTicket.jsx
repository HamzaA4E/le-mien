import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../utils/axios';
import Layout from '../components/Layout';

const EditTicket = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    id_priorite: '',
    id_statut: '',
    id_demandeur: '',
    id_societe: '',
    id_emplacement: '',
    id_categorie: '',
    id_type_demande: '',
    date_debut: '',
    date_fin_prevue: '',
  });
  const [options, setOptions] = useState({
    priorites: [],
    statuts: [],
    demandeurs: [],
    societes: [],
    emplacements: [],
    categories: [],
    typesDemande: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ticketResponse, optionsResponse] = await Promise.all([
          axios.get(`/api/tickets/${id}`),
          axios.get('/api/tickets/options'),
        ]);

        const ticket = ticketResponse.data;
        setFormData({
          titre: ticket.titre || '',
          description: ticket.description || '',
          id_priorite: ticket.id_priorite || '',
          id_statut: ticket.id_statut || '',
          id_demandeur: ticket.id_demandeur || '',
          id_societe: ticket.id_societe || '',
          id_emplacement: ticket.id_emplacement || '',
          id_categorie: ticket.id_categorie || '',
          id_type_demande: ticket.id_type_demande || '',
          date_debut: ticket.date_debut ? new Date(ticket.date_debut).toISOString().slice(0, 16) : '',
          date_fin_prevue: ticket.date_fin_prevue ? new Date(ticket.date_fin_prevue).toISOString().slice(0, 16) : '',
        });

        setOptions(optionsResponse.data);
        setError('');
      } catch (err) {
        setError('Erreur lors du chargement des données');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      // Récupérer le token CSRF depuis le cookie
      const token = document.cookie.split('; ').find(row => row.startsWith('XSRF-TOKEN='))?.split('=')[1];
      
      // Préparer les données avec le format de date correct
      const dataToSend = {
        ...formData,
        date_debut: formData.date_debut ? new Date(formData.date_debut).toISOString() : null,
        date_fin_prevue: formData.date_fin_prevue ? new Date(formData.date_fin_prevue).toISOString() : null,
      };

      // Ajouter le token CSRF dans les headers
      const response = await axios.put(`/api/tickets/${id}`, dataToSend, {
        headers: {
          'X-XSRF-TOKEN': decodeURIComponent(token),
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data.success) {
        navigate(`/tickets/${id}`);
      } else {
        setError(response.data.message || 'Erreur lors de la modification du ticket');
      }
    } catch (err) {
      console.error('Erreur complète:', err);
      setError(err.response?.data?.message || 'Erreur lors de la modification du ticket');
    } finally {
      setSaving(false);
    }
  };

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
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Modifier le ticket</h1>
          <Link
            to={`/tickets/${id}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Annuler
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="titre" className="block text-sm font-medium text-gray-700">
                Titre
              </label>
              <input
                type="text"
                name="titre"
                id="titre"
                required
                value={formData.titre}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="id_priorite" className="block text-sm font-medium text-gray-700">
                Priorité
              </label>
              <select
                name="id_priorite"
                id="id_priorite"
                required
                value={formData.id_priorite}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Sélectionner une priorité</option>
                {options.priorites.map(priorite => (
                  <option key={priorite.id} value={priorite.id}>
                    {priorite.designation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="id_statut" className="block text-sm font-medium text-gray-700">
                Statut
              </label>
              <select
                name="id_statut"
                id="id_statut"
                required
                value={formData.id_statut}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Sélectionner un statut</option>
                {options.statuts.map(statut => (
                  <option key={statut.id} value={statut.id}>
                    {statut.designation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="id_demandeur" className="block text-sm font-medium text-gray-700">
                Demandeur
              </label>
              <select
                name="id_demandeur"
                id="id_demandeur"
                required
                value={formData.id_demandeur}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Sélectionner un demandeur</option>
                {options.demandeurs.map(demandeur => (
                  <option key={demandeur.id} value={demandeur.id}>
                    {demandeur.designation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="id_societe" className="block text-sm font-medium text-gray-700">
                Société
              </label>
              <select
                name="id_societe"
                id="id_societe"
                required
                value={formData.id_societe}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Sélectionner une société</option>
                {options.societes.map(societe => (
                  <option key={societe.id} value={societe.id}>
                    {societe.designation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="id_emplacement" className="block text-sm font-medium text-gray-700">
                Emplacement
              </label>
              <select
                name="id_emplacement"
                id="id_emplacement"
                required
                value={formData.id_emplacement}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Sélectionner un emplacement</option>
                {options.emplacements.map(emplacement => (
                  <option key={emplacement.id} value={emplacement.id}>
                    {emplacement.designation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="id_categorie" className="block text-sm font-medium text-gray-700">
                Catégorie
              </label>
              <select
                name="id_categorie"
                id="id_categorie"
                required
                value={formData.id_categorie}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Sélectionner une catégorie</option>
                {options.categories.map(categorie => (
                  <option key={categorie.id} value={categorie.id}>
                    {categorie.designation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="id_type_demande" className="block text-sm font-medium text-gray-700">
                Type de demande
              </label>
              <select
                name="id_type_demande"
                id="id_type_demande"
                required
                value={formData.id_type_demande}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Sélectionner un type de demande</option>
                {options.typesDemande.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.designation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="date_debut" className="block text-sm font-medium text-gray-700">
                Date de début
              </label>
              <input
                type="datetime-local"
                name="date_debut"
                id="date_debut"
                value={formData.date_debut}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="date_fin_prevue" className="block text-sm font-medium text-gray-700">
                Date de fin prévue
              </label>
              <input
                type="datetime-local"
                name="date_fin_prevue"
                id="date_fin_prevue"
                value={formData.date_fin_prevue}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              id="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default EditTicket; 