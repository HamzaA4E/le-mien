import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TicketReport = ({ ticketId, onlyForm = false }) => {
  const [reports, setReports] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [raison, setRaison] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReports = async () => {
    try {
      const response = await axios.get(`/api/tickets/${ticketId}/reports`);
      setReports(response.data);
    } catch (err) {
      setError('Erreur lors du chargement des reports');
      console.error('Erreur:', err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [ticketId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await axios.post(`/api/tickets/${ticketId}/reports`, { raison });
      setRaison('');
      setIsOpen(false);
      fetchReports();
    } catch (err) {
      setError('Erreur lors de la création du report');
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  if (onlyForm) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="raison" className="block text-sm font-medium text-gray-700">
            Raison du report
          </label>
          <textarea
            id="raison"
            value={raison}
            onChange={(e) => setRaison(e.target.value)}
            required
            className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
            rows={4}
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end space-x-2">
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" disabled={loading}>
            {loading ? 'Création...' : 'Créer'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Reports</h3>
        {isOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            {/* Add your modal content here */}
          </div>
        ) : (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => setIsOpen(true)}
          >
            Nouveau Report
          </button>
        )}
      </div>

      <div className="space-y-4">
        {reports.map((report) => (
          <div key={report.id} className="bg-white rounded shadow p-4">
            <div className="mb-2 font-semibold text-sm">
              Report par {report.responsable?.designation} le{' '}
              {new Date(report.DateReport).toLocaleString('fr-FR')}
            </div>
            <div>
              <p className="text-gray-700">{report.Raison}</p>
            </div>
          </div>
        ))}
        {reports.length === 0 && (
          <p className="text-gray-500 text-center py-4">Aucun report pour ce ticket</p>
        )}
      </div>
    </div>
  );
};

export default TicketReport; 