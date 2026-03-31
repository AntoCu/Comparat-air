import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function LoginPage({ setIsLoggedIn, setUserEmail }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      const response = await fetch('http://127.0.0.1:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (response.ok) {
        setUserEmail(data.email);
        setIsLoggedIn(true);
        navigate('/menu');
      } else {
        setErrorMessage(data.detail || "Erreur de connexion.");
      }
    } catch (error) {
      setErrorMessage("Impossible de joindre l'API");
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>Portail de Connexion</h2>
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', width: '300px', margin: '0 auto', gap: '10px' }}>
        <input 
          type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required 
        />
        <input 
          type="password" placeholder="Mot de passe" value={password}
          onChange={(e) => setPassword(e.target.value)} required 
        />
        <button type="submit">Se connecter</button>
      </form>
      <p style={{ marginTop: '20px' }}>
        Pas encore de compte ? <Link to="/register">S'inscrire</Link>
      </p>
    </div>
  );
}