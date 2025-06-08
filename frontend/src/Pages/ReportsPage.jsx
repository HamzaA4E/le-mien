import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import * as XLSX from 'xlsx';
import Layout from '../components/Layout';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import ReportExport from '../components/ReportExport';

// Enregistrer les composants Chart.js nécessaires
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const ReportsPage = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('tickets_by_service');
  const [services, setServices] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedService, setSelectedService] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [chartType, setChartType] = useState('pie');

  useEffect(() => {
    fetchServices();
    fetchStatuses();
    fetchPriorities();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.get('/api/services?all=1');
      setServices(response.data);
    } catch (err) {
      console.error('Erreur lors du chargement des services:', err);
      setError('Erreur lors du chargement des services');
    }
  };

  const fetchStatuses = async () => {
    try {
      const response = await axios.get('/api/statuts');
      setStatuses(response.data);
    } catch (err) {
      console.error('Erreur lors du chargement des statuts:', err);
      setError('Erreur lors du chargement des statuts');
    }
  };

  const fetchPriorities = async () => {
    try {
      const response = await axios.get('/api/priorites');
      setPriorities(response.data);
    } catch (err) {
      console.error('Erreur lors du chargement des priorités:', err);
      setError('Erreur lors du chargement des priorités');
    }
  };

  const generateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        type: reportType,
        service: selectedService !== 'all' ? selectedService : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        priority: selectedPriority !== 'all' ? selectedPriority : undefined
      };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await axios.get('/api/reports', { params });
      setReportData(response.data);
    } catch (err) {
      console.error('Erreur lors de la génération du rapport:', err);
      setError('Erreur lors de la génération du rapport');
    } finally {
      setLoading(false);
    }
  };

  const getTableColumns = () => {
    if (!reportData || !Array.isArray(reportData) || reportData.length === 0) return [];
    return Object.keys(reportData[0]);
  };

  const getChartColumns = () => {
    const columns = getTableColumns();
    const labelCol = columns.find(col =>
      /service|statut|priorit|demandeur|période|categorie/i.test(col)
    ) || columns[0];
    const valueCol = columns.find(col =>
      /nombre|total|count|valeur/i.test(col)
    ) || columns[1];
    return { labelCol, valueCol };
  };

  const prepareChartData = () => {
    if (!reportData || !Array.isArray(reportData) || reportData.length === 0) return null;
    const { labelCol, valueCol } = getChartColumns();
    const labels = reportData.map(item => item[labelCol]);
    const data = reportData.map(item => parseFloat(item[valueCol]) || 0);
    const backgroundColors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'
    ];
    return {
      labels,
      datasets: [{
        data,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors.map(color => color.replace('0.8', '1')),
        borderWidth: 1
      }]
    };
  };

  const exportToExcel = () => {
    if (!reportData || !Array.isArray(reportData) || reportData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const wscols = getTableColumns().map(() => ({ wch: 20 }));
    worksheet['!cols'] = wscols;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rapport");
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `rapport_${reportType}_${today}.xlsx`);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Génération de Rapports</h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-blue-600 hover:text-blue-800"
            >
              {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
            </button>
          </div>

          {showFilters && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de rapport
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="tickets_by_service">Tickets par service</option>
                    <option value="tickets_by_status">Tickets par statut</option>
                    <option value="tickets_by_priority">Tickets par priorité</option>
                    <option value="tickets_by_demandeur">Tickets par demandeur</option>
                    <option value="tickets_by_period">Tickets par période</option>
                    <option value="tickets_by_type_demande">Tickets par catégorie</option>
                    <option value="tickets_detailed">Rapport détaillé</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de graphique
                  </label>
                  <select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pie">Graphique circulaire</option>
                    <option value="bar">Graphique en barres</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service
                  </label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Tous les services</option>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>
                        {service.designation}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Tous les statuts</option>
                    {statuses.map(status => (
                      <option key={status.id} value={status.id}>
                        {status.designation}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priorité
                  </label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">Toutes les priorités</option>
                    {priorities.map(priority => (
                      <option key={priority.id} value={priority.id}>
                        {priority.designation}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <button
              onClick={generateReport}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Génération...' : 'Générer le rapport'}
            </button>

            {reportData && (
              <>
                <button
                  onClick={exportToExcel}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Exporter en Excel
                </button>
                <ReportExport
                  reportTitle={reportType.replace(/_/g, ' ').toUpperCase()}
                  reportDate={new Date().toLocaleDateString('fr-FR')}
                />
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {reportData && Array.isArray(reportData) && reportData.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 report-content">
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Visualisation</h3>
              <div className="w-full max-w-md mx-auto" style={{height: '300px'}}>
                {chartType === 'pie' ? (
                  <Pie data={prepareChartData()} options={{ responsive: true, maintainAspectRatio: false }} height={220} />
                ) : (
                  <Bar 
                    data={prepareChartData()} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        title: {
                          display: true,
                          text: 'Rapport de tickets'
                        }
                      }
                    }}
                    height={220}
                  />
                )}
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Données détaillées</h3>
              <div className="w-full">
                <table className="w-full table-auto border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      {getTableColumns().map((col, idx) => (
                        <th key={idx} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const columns = getTableColumns();
                      const isByService = reportType === 'tickets_by_service' && columns.includes('Service');
                      if (!isByService) {
                        return reportData.map((item, index) => (
                          <tr key={index}>
                            {columns.map((col, idx) => (
                              <td key={idx} className="px-4 py-3 text-sm text-gray-900 border-b">
                                {typeof item[col] === 'object' && item[col] !== null && item[col].date
                                  ? new Date(item[col].date).toLocaleString()
                                  : String(item[col] ?? '')
                                }
                              </td>
                            ))}
                          </tr>
                        ));
                      }
                      const grouped = {};
                      reportData.forEach((item, idx) => {
                        const service = item['Service'];
                        if (!grouped[service]) grouped[service] = [];
                        grouped[service].push({ item, idx });
                      });
                      const rows = [];
                      Object.entries(grouped).forEach(([service, items]) => {
                        items.forEach(({ item, idx }, i) => {
                          rows.push(
                            <tr key={idx}>
                              {columns.map((col, colIdx) => {
                                if (col === 'Service') {
                                  if (i === 0) {
                                    return (
                                      <td key={colIdx} rowSpan={items.length} className="px-4 py-3 text-sm text-gray-900 font-bold bg-gray-50 align-middle border-b border-r">
                                        {service}
                                      </td>
                                    );
                                  } else {
                                    return null;
                                  }
                                }
                                return (
                                  <td key={colIdx} className="px-4 py-3 text-sm text-gray-900 border-b">
                                    {typeof item[col] === 'object' && item[col] !== null && item[col].date
                                      ? new Date(item[col].date).toLocaleString()
                                      : String(item[col] ?? '')
                                    }
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        });
                      });
                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {reportData && (!Array.isArray(reportData) || reportData.length === 0) && (
          <div className="text-center text-gray-500 py-12">
            Aucune donnée à afficher pour les critères sélectionnés.
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ReportsPage; 