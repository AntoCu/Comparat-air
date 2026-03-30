import { useNavigate } from 'react-router-dom';

export default function MenuPage({ userEmail, setIsLoggedIn }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    setIsLoggedIn(false);
    navigate('/login');
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>Menu Principal</h1>
      <p>Bienvenue, tu es connecté avec : <strong>{userEmail}</strong></p>
      <br />
      <button onClick={handleLogout} style={{ backgroundColor: '#dc3545', color: 'white', padding: '10px' }}>
        Se déconnecter
      </button>
    </div>
  );
}