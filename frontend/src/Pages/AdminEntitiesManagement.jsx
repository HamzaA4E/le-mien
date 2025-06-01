import React, { useState } from 'react';
import EntityManagement from './EntityManagement';
import Layout from '../components/Layout';

const entities = [
  { entity: 'categories', label: 'Catégorie' },
  { entity: 'emplacements', label: 'Emplacement' },
  { entity: 'societes', label: 'Société' },
  { entity: 'demandeurs', label: 'Demandeur' },
  { entity: 'services', label: 'Service' },
  { entity: 'priorites', label: 'Priorité' },
  { entity: 'statuts', label: 'Statut' },
];

const AdminEntitiesManagement = () => {
  const [activeTab, setActiveTab] = useState(entities[0].entity);
  const [loadedTabs, setLoadedTabs] = useState([entities[0].entity]);

  const handleTabClick = (entity) => {
    setActiveTab(entity);
    setLoadedTabs(prev => prev.includes(entity) ? prev : [...prev, entity]);
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-6 bg-white rounded shadow">
        <h2 className="text-2xl font-bold mb-6">Gestion des référentiels</h2>
        <div className="flex flex-wrap gap-2 mb-6">
          {entities.map(e => (
            <button
              key={e.entity}
              onClick={() => handleTabClick(e.entity)}
              className={`px-4 py-2 rounded font-semibold border transition-colors ${activeTab === e.entity ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-100'}`}
            >
              {e.label}s
            </button>
          ))}
        </div>
        <div>
          {entities.map(e => (
            <div
              key={e.entity}
              style={{ display: activeTab === e.entity ? 'block' : 'none' }}
            >
              <EntityManagement entity={e.entity} label={e.label} />
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default AdminEntitiesManagement; 