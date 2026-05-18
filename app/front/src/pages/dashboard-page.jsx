import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend
} from 'recharts';

// --- DONNÉES FACTICES POUR LES GRAPHIQUES (En attendant tes prochaines requêtes SQL) ---
const topDestinationsData = [
  { name: 'Paris', unique_searches: 250 },
  { name: 'Londres', unique_searches: 174 },
  { name: 'Tokyo', unique_searches: 123 },
  { name: 'New York', unique_searches: 130 },
  { name: 'Rome', unique_searches: 101 },
];

const devicesData = [
  { name: 'Mobile', value: 65, fill: '#3b82f6' },
  { name: 'Desktop', value: 30, fill: '#10b981' },
  { name: 'Tablette', value: 5, fill: '#f59e0b' },
];

// --- COMPOSANTS DE BASE ---
const KpiCard = ({ kpi }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
    <p className="text-sm font-medium text-gray-500">{kpi.name}</p>
    <div className="flex items-baseline gap-2 mt-2">
      <p className="text-4xl font-bold text-gray-900">{kpi.value}</p>
      {kpi.change && (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${kpi.changeType === 'positive' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
          {kpi.change}
        </span>
      )}
    </div>
  </div>
);

const ChartCard = ({ title, children, className }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 ${className}`}>
    <h3 className="text-lg font-semibold text-gray-800 mb-6">{title}</h3>
    {children}
  </div>
);

export default function DashboardPage() {
  const navigate = useNavigate();
  
  const [logs, setLogs] = useState([]);
  const [totalUsers, setTotalUsers] = useState("...");
  const [errorMessage, setErrorMessage] = useState('');

  const fetchLogs = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://127.0.0.1:8000/admin/logs', {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data);
        setErrorMessage('');
      } else {
        setErrorMessage("Erreur d'accès aux logs ou session expirée.");
      }
    } catch (error) {
      setErrorMessage(error, "Impossible de joindre l'API des logs.");
    }
  };

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('http://127.0.0.1:8000/admin/stats', {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTotalUsers(data.kpis.total_utilisateurs);
      }
    } catch (error) {
      console.error("Impossible de récupérer les stats", error);
    }
  };

  const refreshAll = () => {
    fetchLogs();
    fetchStats();
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshAll();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpis = [
    { name: 'Utilisateurs Inscrits (Total)', value: totalUsers, change: 'BDD Neon', changeType: 'positive' }
  ];

  return (
    <div className="p-8 md:p-12 bg-gray-50 min-h-screen">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950">Tableau de Bord des statistiques</h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={refreshAll}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm font-medium text-sm"
          >
            Actualiser les données
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded shadow-sm">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {kpis.map((kpi, index) => (
          <KpiCard key={index} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        
        <ChartCard title="Flux de Logs SIEM (Temps réel)" className="xl:col-span-2">
          <div className="overflow-x-auto h-[350px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Utilisateur</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">IP</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Raison</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100 text-gray-800">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{log.timestamp}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">{log.user}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-xs">{log.ip}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-red-600 font-semibold">{log.reason}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-gray-500 italic">
                      Aucun log à afficher pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>

        {/* Graphique de répartition (Prend 1/3 de l'espace) */}
        <ChartCard title="Répartition des Appareils">
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={devicesData} innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" >
                  {devicesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

      </div>

      {/* --- Section Graphiques de Recherche (Fausses données pour le moment) --- */}
      <div className="grid grid-cols-1 gap-6">
        <ChartCard title="Top 5 Destinations Trackées (Simulé)">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDestinationsData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <XAxis type="number" axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="unique_searches" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

    </div>
  );
}