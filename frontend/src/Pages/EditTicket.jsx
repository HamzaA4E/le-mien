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
    Titre: '',
    Description: '',
    Commentaire: '',
    Id_Priorite: '',
    Id_Statut: '',
    Id_Demandeur: '',
    Id_Societe: '',
    Id_Emplacement: '',
    Id_Categorie: '',
    Id_TypeDemande: '',
    Id_Executant: '',
    DateDebut: '',
    DateFinPrevue: '',
  });
  const [options, setOptions] = useState({
    priorites: [],
    statuts: [],
    demandeurs: [],
    societes: [],
    emplacements: [],
    categories: [],
    typesDemande: [],
    executants: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Charger d'abord le ticket
        const ticketResponse = await axios.get(`/api/tickets/${id}`);
        const ticket = ticketResponse.data;

        // Mettre à jour le formulaire avec les données du ticket
        setFormData({
          Titre: ticket.Titre || '',
          Description: ticket.Description || '',
          Commentaire: ticket.Commentaire || '',
          Id_Priorite: ticket.Id_Priorite || '',
          Id_Statut: ticket.Id_Statut || '',
          Id_Demandeur: ticket.Id_Demandeur || '',
          Id_Societe: ticket.Id_Societe || '',
          Id_Emplacement: ticket.Id_Emplacement || '',
          Id_Categorie: ticket.Id_Categorie || '',
          Id_TypeDemande: ticket.Id_TypeDemande || '',
          Id_Executant: ticket.Id_Executant || '',
          DateDebut: ticket.DateDebut ? new Date(ticket.DateDebut.date || ticket.DateDebut).toISOString().slice(0, 16) : '',
          DateFinPrevue: ticket.DateFinPrevue ? new Date(ticket.DateFinPrevue.date || ticket.DateFinPrevue).toISOString().slice(0, 16) : '',
        });

        // Charger ensuite les options
        const optionsResponse = await axios.get('/api/tickets/options');
        const executantsResponse = await axios.get('/api/executants');

        // Filtrer les entités actives
        const filteredOptions = {
          priorites: optionsResponse.data.priorites.filter(item => item.is_active !== false),
          statuts: optionsResponse.data.statuts.filter(item => item.is_active !== false),
          demandeurs: optionsResponse.data.demandeurs.filter(item => item.is_active !== false),
          societes: optionsResponse.data.societes.filter(item => item.is_active !== false),
          emplacements: optionsResponse.data.emplacements.filter(item => item.is_active !== false),
          categories: optionsResponse.data.categories.filter(item => item.is_active !== false),
          typesDemande: optionsResponse.data.typesDemande.filter(item => item.is_active !== false),
          executants: executantsResponse.data.filter(item => item.is_active !== false)
        };

        // Mettre à jour les options
        setOptions(filteredOptions);
      } catch (err) {
        console.error('Erreur:', err);
        setError(err.response?.data?.error || 'Erreur lors du chargement des données');
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
      const dataToSend = {
        ...formData,
        DateDebut: formData.DateDebut ? new Date(formData.DateDebut).toISOString() : null,
        DateFinPrevue: formData.DateFinPrevue ? new Date(formData.DateFinPrevue).toISOString() : null,
      };

      await axios.put(`/api/tickets/${id}`, dataToSend);
      navigate(`/tickets/${id}`);
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
              <label htmlFor="Titre" className="block text-sm font-medium text-gray-700">
                Titre
              </label>
              <input
                type="text"
                name="Titre"
                id="Titre"
                required
                value={formData.Titre}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="Id_Priorite" className="block text-sm font-medium text-gray-700">
                Priorité
              </label>
              <select
                name="Id_Priorite"
                id="Id_Priorite"
                required
                value={formData.Id_Priorite}
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
              <label htmlFor="Id_Statut" className="block text-sm font-medium text-gray-700">
                Statut
              </label>
              <select
                name="Id_Statut"
                id="Id_Statut"
                required
                value={formData.Id_Statut}
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
              <label htmlFor="Id_Executant" className="block text-sm font-medium text-gray-700">
                Exécutant
              </label>
              <select
                name="Id_Executant"
                id="Id_Executant"
                required
                value={formData.Id_Executant}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Sélectionner un exécutant</option>
                {options.executants.map(executant => (
                  <option key={executant.id} value={executant.id}>
                    {executant.designation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="Id_Demandeur" className="block text-sm font-medium text-gray-700">
                Demandeur
              </label>
              <select
                name="Id_Demandeur"
                id="Id_Demandeur"
                required
                value={formData.Id_Demandeur}
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
              <label htmlFor="Id_Societe" className="block text-sm font-medium text-gray-700">
                Société
              </label>
              <select
                name="Id_Societe"
                id="Id_Societe"
                required
                value={formData.Id_Societe}
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
              <label htmlFor="Id_Emplacement" className="block text-sm font-medium text-gray-700">
                Emplacement
              </label>
              <select
                name="Id_Emplacement"
                id="Id_Emplacement"
                required
                value={formData.Id_Emplacement}
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
              <label htmlFor="Id_Categorie" className="block text-sm font-medium text-gray-700">
                Catégorie
              </label>
              <select
                name="Id_Categorie"
                id="Id_Categorie"
                required
                value={formData.Id_Categorie}
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
              <label htmlFor="Id_TypeDemande" className="block text-sm font-medium text-gray-700">
                Type de demande
              </label>
              <select
                name="Id_TypeDemande"
                id="Id_TypeDemande"
                required
                value={formData.Id_TypeDemande}
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
              <label htmlFor="DateDebut" className="block text-sm font-medium text-gray-700">
                Date de début
              </label>
              <input
                type="datetime-local"
                name="DateDebut"
                id="DateDebut"
                required
                value={formData.DateDebut}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="DateFinPrevue" className="block text-sm font-medium text-gray-700">
                Date de fin prévue
              </label>
              <input
                type="datetime-local"
                name="DateFinPrevue"
                id="DateFinPrevue"
                required
                value={formData.DateFinPrevue}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="Description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="Description"
              id="Description"
              rows="3"
              required
              value={formData.Description}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="Commentaire" className="block text-sm font-medium text-gray-700">
              Commentaire
            </label>
            <textarea
              name="Commentaire"
              id="Commentaire"
              rows="3"
              value={formData.Commentaire}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(`/tickets/${id}`)}
              className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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