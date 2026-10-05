import React, { useState, useEffect } from 'react';
import { Truck, Plus, RefreshCw, CheckCircle, Clock, MapPin, Shield, Layers, Radio } from 'lucide-react';
import { api } from '../services/api';
import { Resource } from '../types';
import { useLanguage } from '../context/LanguageContext';

export const ResourceManagementPage: React.FC = () => {
  const { t } = useLanguage();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New resource form
  const [name, setName] = useState('');
  const [type, setType] = useState('AMBULANCE');
  const [station, setStation] = useState('Central District Staging HQ');
  const [capacity, setCapacity] = useState(4);
  const [lat, setLat] = useState(13.082);
  const [lng, setLng] = useState(80.27);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const data = await api.resources.list();
      setResources(data);
    } catch (e) {
      console.error('Failed to fetch resources:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.resources.create({
        resource_name: name,
        resource_type: type,
        station_name: station,
        capacity: Number(capacity),
        latitude: lat,
        longitude: lng,
        status: 'AVAILABLE',
      });
      setShowAddModal(false);
      setName('');
      fetchResources();
    } catch (err: any) {
      alert(err.message || 'Failed to register emergency asset');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ivory-300 dark:border-forest-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-widest bg-forest-100 text-forest-800 dark:bg-forest-900 dark:text-sage-300 border border-forest-200 dark:border-forest-700">
              Fleet Optimization & Asset Logistics
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-forest-950 dark:text-ivory-50 mt-1">
            {t('navResources', 'Emergency Fleet & Rescue Units')}
          </h1>
          <p className="text-xs text-forest-700 dark:text-sage-400 mt-0.5">
            Real-time geospatial tracking of ambulances, rescue boats, fire tenders, and rapid response units.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchResources}
            className="p-2 bg-ivory-100 dark:bg-forest-900 hover:bg-ivory-200 dark:hover:bg-forest-800 text-forest-800 dark:text-sage-200 rounded-lg border border-ivory-300 dark:border-forest-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-forest-800 hover:bg-forest-900 text-ivory-50 dark:bg-forest-700 dark:hover:bg-forest-600 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Register Response Unit</span>
          </button>
        </div>
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {resources.map((res) => (
          <div key={res.id} className="bg-white dark:bg-forest-900/90 border border-ivory-300 dark:border-forest-800 rounded-xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-ivory-200 text-forest-800 dark:bg-forest-950 dark:text-sage-300 border border-ivory-300 dark:border-forest-700">
                  {res.resource_type}
                </span>
                <h3 className="font-serif font-bold text-base text-forest-950 dark:text-ivory-50 mt-2">{res.resource_name}</h3>
                <div className="text-xs text-forest-600 dark:text-sage-400 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-forest-500 dark:text-sage-500" />
                  <span>{res.station_name || 'Operational Depot'}</span>
                </div>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                res.status === 'AVAILABLE'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700'
                  : res.status === 'ASSIGNED'
                  ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700'
                  : 'bg-ivory-200 text-forest-800 border-ivory-400 dark:bg-forest-950 dark:text-sage-400 dark:border-forest-800'
              }`}>
                {res.status}
              </span>
            </div>

            <div className="text-xs text-forest-700 dark:text-sage-400 pt-3 border-t border-ivory-200 dark:border-forest-800/80 flex items-center justify-between font-mono">
              <span>Capacity: {res.capacity || 4} personnel</span>
              <span>[{res.latitude.toFixed(3)}, {res.longitude.toFixed(3)}]</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-forest-900 border border-ivory-300 dark:border-forest-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h2 className="font-serif font-bold text-xl text-forest-950 dark:text-ivory-50">Register Emergency Unit</h2>
            <form onSubmit={handleCreateResource} className="space-y-4 text-xs">
              <div>
                <label className="block text-forest-800 dark:text-sage-300 font-semibold mb-1">Unit Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Swift Rescue Boat Charlie"
                  className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-700 rounded-lg p-2.5 text-forest-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-forest-600"
                />
              </div>

              <div>
                <label className="block text-forest-800 dark:text-sage-300 font-semibold mb-1">Asset Specialization</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-700 rounded-lg p-2.5 text-forest-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-forest-600"
                >
                  <option value="AMBULANCE">Ambulance Unit</option>
                  <option value="FIRE_TRUCK">Fire Pumper Tender</option>
                  <option value="RESCUE_BOAT">Flood Rescue Watercraft</option>
                  <option value="POLICE_CAR">Tactical Police Vehicle</option>
                  <option value="HAZMAT_UNIT">Hazmat Chemical Unit</option>
                </select>
              </div>

              <div>
                <label className="block text-forest-800 dark:text-sage-300 font-semibold mb-1">Station Base Name</label>
                <input
                  type="text"
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  className="w-full bg-ivory-50 dark:bg-forest-950 border border-ivory-300 dark:border-forest-700 rounded-lg p-2.5 text-forest-950 dark:text-white focus:outline-none focus:ring-1 focus:ring-forest-600"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-ivory-200 dark:border-forest-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-ivory-200 dark:bg-forest-800 hover:bg-ivory-300 dark:hover:bg-forest-700 text-forest-900 dark:text-sage-200 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-forest-800 hover:bg-forest-900 dark:bg-forest-700 dark:hover:bg-forest-600 text-ivory-50 rounded-lg font-bold transition-colors shadow-sm"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
