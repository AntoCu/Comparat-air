import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function DashboardPage() {
  const [logs, setLogs] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  // Fonction pour récupérer les logs depuis l'API
  const fetchLogs = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/admin/logs');
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      } else {
        setErrorMessage("Erreur lors de la récupération des logs.");
      }
    } catch (error) {
      setErrorMessage("Impossible de joindre l'API pour les logs.");
    }
  };

  // Charger les logs au montage de la page
  useEffect(() => {
    fetchLogs();
    // Optionnel : Rafraîchir toutes les 10 secondes
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Tableau de Bord Sécurité (SIEM)</h2>
      <p>Surveillance des tentatives de connexion en temps réel</p>
      
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

      <div style={{ maxWidth: '800px', margin: '20px auto', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f4f4f4', borderBottom: '2px solid #ddd' }}>
              <th style={{ padding: '10px' }}>Date</th>
              <th style={{ padding: '10px' }}>Utilisateur</th>
              <th style={{ padding: '10px' }}>Adresse IP</th>
              <th style={{ padding: '10px' }}>Raison de l'échec</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <tr key={index} style={{ 
                  borderBottom: '1px solid #eee', 
                  backgroundColor: log.reason === 'unknown_user' ? '#fff5f5' : 'transparent' 
                }}>
                  <td style={{ padding: '10px', fontSize: '14px' }}>{log.timestamp}</td>
                  <td style={{ padding: '10px' }}>{log.user}</td>
                  <td style={{ padding: '10px' }}><code>{log.ip}</code></td>
                  <td style={{ 
                    padding: '10px', 
                    color: log.reason === 'unknown_user' ? '#d9534f' : '#f0ad4e',
                    fontWeight: 'bold'
                  }}>
                    {log.reason}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ padding: '20px' }}>Aucune tentative d'intrusion détectée.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <button onClick={fetchLogs} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Actualiser
        </button>
        <button onClick={() => navigate('/menu')} style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none' }}>
          Retour au Menu
        </button>
      </div>
      
      <p style={{ marginTop: '40px', fontSize: '12px', color: '#666' }}>
        Données synchronisées avec l'agent Wazuh (Location: /var/log/skystream/access.log)
      </p>
    </div>
  );
}