import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend
} from 'recharts';

// --- PALETTE DE COULEURS POUR LES GRAPHIQUES ---
const ECO_COLORS = ['#ECA920' ,'#E42824','#2BBF57'];

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
  const [logs, setLogs] = useState([]);
  const [totalUsers, setTotalUsers] = useState("...");
  const [meanPassengers, setMeanPassengers] = useState("...");
  const [topDepartures, setTopDepartures] = useState([]);
  const [topArrivals, setTopArrivals] = useState([]);
  const [departureDays, setDepartureDays] = useState([]);
  const [ecoDistribution, setEcoDistribution] = useState([]);
  //const [likesPriceCorrelation, setLikesPriceCorrelation] = useState([]);
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
        setMeanPassengers(data.kpis.mean_passengers);
        setTopDepartures(data.top_departures);
        setTopArrivals(data.top_arrivals);
        setDepartureDays(data.departures_days);
        setEcoDistribution(data.eco_distribution);
        //setLikesPriceCorrelation(data.likes_price_correlation);
        console.log("RETOUR COMPLET DU BACKEND :", data);
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
    { name: 'Utilisateurs enregistrés', value: totalUsers, change: 'BDD Neon', changeType: 'positive' },
    { name: 'Moyenne passagers par recherche', value: meanPassengers, change: 'BDD Neon', changeType: 'positive' }
  ];

  return (
    <div className="p-8 md:p-12 bg-gray-50 min-h-screen mt-24">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#262262]">Tableau de Bord des statistiques</h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={refreshAll}
            className="px-4 py-2 bg-white border border-gray-200 text-[#262262] rounded-lg hover:bg-gray-50 transition shadow-sm font-medium text-sm"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        <ChartCard title="Flux de Logs SIEM (Temps réel)" >
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
        <div className="flex flex-col gap-6">
          <ChartCard title="Top Aéroports de départ">
            <div className="h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDepartures} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="airport" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} width={40} />
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  />
                  <Bar dataKey="count" fill="#9257ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Top Aéroports d'arrivée">
            <div className="h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topArrivals} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="airport" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} width={40} />
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  />
                  <Bar dataKey="count" fill="#b9ff49" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <ChartCard title="Jour de la semaine le plus liké">
          <div className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departureDays} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} width={40} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Bar dataKey="count" fill="#499eff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Indice éco responsable">
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={ecoDistribution} 
                  cx="50%"           
                  cy="50%"           
                  innerRadius={60}   
                  outerRadius={80}   
                  paddingAngle={5}   
                  dataKey="count"
                  nameKey="category"
                >
                  {ecoDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={ECO_COLORS[index % ECO_COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* <ChartCard title="Correlation likes et indice de prix">
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={likesPriceCorrelation} 
                  cx="50%"           
                  cy="50%"           
                  innerRadius={60}   
                  outerRadius={80}   
                  paddingAngle={5}   
                  dataKey="count"
                  nameKey="status"
                >
                  {likesPriceCorrelation.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={ECO_COLORS[index % ECO_COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard> */}
      </div>

    </div>
  );
}