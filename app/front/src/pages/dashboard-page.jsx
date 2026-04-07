import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const [logs, setLogs] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

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
        setErrorMessage("Erreur d'accès ou session expirée.");
      }
    } catch (error) {
      setErrorMessage("Impossible de joindre l'API.");
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>Tableau de Bord Sécurité (SIEM)</h2>
      <p style={{ fontSize: '14px', color: '#666' }}>Flux de logs en temps réel</p>
      
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid black' }}>
              <th style={{ padding: '10px' }}>Date</th>
              <th style={{ padding: '10px' }}>Utilisateur</th>
              <th style={{ padding: '10px' }}>IP</th>
              <th style={{ padding: '10px' }}>Raison</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #ccc' }}>
                  <td style={{ padding: '10px' }}>{log.timestamp}</td>
                  <td style={{ padding: '10px' }}>{log.user}</td>
                  <td style={{ padding: '10px' }}>{log.ip}</td>
                  <td style={{ padding: '10px', color: 'red', fontWeight: 'bold' }}>{log.reason}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ padding: '20px' }}>Aucun log à afficher.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <button onClick={fetchLogs}>Actualiser</button>
        <button onClick={() => navigate('/menu')}>Retour au Menu</button>
      </div>
    </div>
  );
}