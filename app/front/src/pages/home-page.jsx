import { useState } from 'react';

export default function HomePage() {
  const [departure, setDeparture] = useState('CDG');
  const [date, setDate] = useState('');
  const [maxPrice, setMaxPrice] = useState(500);
  const [passengers, setPassengers] = useState(1);
  const [isDirect, setIsDirect] = useState(false); 
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResults([]);

    try {
      const response = await fetch('http://127.0.0.1:8000/search-flights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          departure: departure,
          date: date,
          max_price: Number(maxPrice),
          passengers: Number(passengers),
          is_direct: isDirect
        }),
      });
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Erreur de recherche", error);
      alert("Impossible de contacter le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = (flight) => {
    console.log("Vol liké :", flight);
    alert(`Tu as liké le vol vers ${flight.destination} à ${flight.price}€ !`);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Trouvez votre prochain vol ✈️</h1>
      
      {/* --- FORMULAIRE DE RECHERCHE --- */}
      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
        <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          
          <div>
            <label>Aéroport de départ :</label>
            <input type="text" value={departure} onChange={(e) => setDeparture(e.target.value.toUpperCase())} maxLength={3} required style={{ width: '100%', padding: '8px' }} />
          </div>

          <div>
            <label>Date de départ :</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
          </div>

          <div>
            <label>Prix maximum (€) :</label>
            <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} min="10" required style={{ width: '100%', padding: '8px' }} />
          </div>

          <div>
            <label>Passagers :</label>
            <input type="number" value={passengers} onChange={(e) => setPassengers(e.target.value)} min="1" max="9" required style={{ width: '100%', padding: '8px' }} />
          </div>
          <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
            <input 
              type="checkbox" 
              id="directCheck"
              checked={isDirect}
              onChange={(e) => setIsDirect(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="directCheck" style={{ fontWeight: 'bold', cursor: 'pointer', color: '#333' }}>
              Vols directs uniquement ✈️
            </label>
          </div>
          <button type="submit" disabled={isLoading} style={{ gridColumn: 'span 2', padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: '16px' }}>
            {isLoading ? "Recherche en cours..." : "Rechercher les vols"}
          </button>
        </form>
      </div>

      {/* --- AFFICHAGE DES RÉSULTATS --- */}
      <div style={{ marginTop: '40px' }}>
        {isLoading && <p style={{ textAlign: 'center' }}>Veuillez patienter, interrogation des compagnies aériennes...</p>}
        
        {!isLoading && results.length > 0 && (
          <div>
            <h3>Résultats trouvés ({results.length}) :</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {results.map((flight) => (
                <div key={flight.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #ddd', padding: '15px', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  
                  <div>
                    {/* On utilise flight.arrivee et flight.dest */}
                    <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>{departure} ➔ {flight.arrivee}</h4>
                    <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                      {/* On utilise flight.horaire_depart et flight.horaire_arrivee */}
                      Départ : {flight.horaire_depart} - Arrivée : {flight.horaire_arrivee}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* On utilise flight.prix */}
                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>{flight.prix} €</span>
                    <button onClick={() => handleLike(flight)} style={{ backgroundColor: '#ff4757', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                      ❤️ Liker
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && results.length === 0 && date !== '' && (
          <p style={{ textAlign: 'center', color: '#666' }}>Aucun vol trouvé sous ce budget pour cette date.</p>
        )}
      </div>
    </div>
  );
}