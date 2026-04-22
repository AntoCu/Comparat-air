import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage({ setIsLoggedIn }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    volsSuivis: 12,
    distanceParcourue: 0, 
    heuresDeVol: 0
  });

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h2>Mon Profil</h2>
      
      <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>Paramètres du compte</h3>
        <p>Email : {localStorage.getItem('email')}</p>
        <button style={{ marginTop: '10px' }}>Modifier le mot de passe</button>
      </div>

      <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h3>Statistiques & Historique</h3>
        <div style={{ marginBottom: '15px' }}>
          <p>Vols suivis : <strong>{stats.volsSuivis}</strong></p>
          {stats.distanceParcourue > 0 && <p>Distance totale : {stats.distanceParcourue} km</p>}
          {stats.heuresDeVol > 0 && <p>Heures de vol : {stats.heuresDeVol} h</p>}
        </div>
        <p style={{ color: '#666', fontStyle: 'italic' }}>Aucun vol récent dans l'historique.</p>
      </div>

      <button onClick={handleLogout} style={{ backgroundColor: '#dc3545', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
        Se déconnecter
      </button>
    </div>
  );
}