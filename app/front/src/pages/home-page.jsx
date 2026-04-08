import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const [destination, setDestination] = useState('');
  const [result, setResult] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://127.0.0.1:8000/search-destination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: destination }),
      });
      const data = await response.json();
      setResult(data.cleaned_query);
    } catch (error) {
      console.error("Erreur de recherche");
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      {/* MENU EN HAUT À DROITE */}
      <nav style={{ textAlign: 'right' }}>
        <ul style={{ 
          listStyle: 'none', 
          display: 'inline-flex', 
          gap: '20px', 
          margin: 0, 
          padding: 0 
        }}>
          <li><Link to="/login">Se connecter</Link></li>
          <li><Link to="/register">Créer un compte</Link></li>
        </ul>
      </nav>

      {/* RESTE DE LA PAGE */}
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h1>Bienvenue sur SkyStream</h1>
        
        <div style={{ margin: '40px auto', border: '1px solid #ccc', padding: '20px', maxWidth: '500px' }}>
          <h3>Où voulez-vous aller ?</h3>
          <form onSubmit={handleSearch}>
            <input 
              type="text" 
              placeholder="Entrez votre destination..." 
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
            <button type="submit">Rechercher</button>
          </form>
          {result && (
            <p style={{ marginTop: '20px' }}>
              Résultat de la recherche pour : <strong>{result}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}