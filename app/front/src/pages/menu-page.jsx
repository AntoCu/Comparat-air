import { useNavigate } from 'react-router-dom';

export default function MenuPage({ userEmail, setIsLoggedIn }) {
  const navigate = useNavigate();
  
  // On récupère le rôle pour la condition
  const role = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    navigate('/login');
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>Menu Principal</h1>
      <p>Bienvenue, tu es connecté avec : <strong>{userEmail}</strong></p>
      
      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
        
        {/* CONDITION : Le bouton ne s'affiche que si le rôle est 'admin' */}
        {role === 'admin' && (
          <button 
            onClick={() => navigate('/dashboard')}
            style={{ backgroundColor: '#17a2b8', color: 'white', padding: '10px', cursor: 'pointer' }}
          >
            Consulter les Logs
          </button>
        )}

        <button onClick={handleLogout} style={{ backgroundColor: '#dc3545', color: 'white', padding: '10px', cursor: 'pointer' }}>
          Se déconnecter
        </button>
      </div>
    </div>
  );
}