import { useState } from 'react';

export default function HomePage() {
  const [departure, setDeparture] = useState('CDG');
  const [date, setDate] = useState('');
  const [maxPrice, setMaxPrice] = useState(500);
  const [passengers, setPassengers] = useState(1);
  const [isDirect, setIsDirect] = useState(false);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [expandedGroups, setExpandedGroups] = useState({});

  const handleSearch = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResults([]);
    setExpandedGroups({});

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

  const handleLike = async (flight) => {
    console.log("L'objet complet cliqué est :", flight);
    const idUtilisateurActuel = localStorage.getItem("user_id");
    
    if (!idUtilisateurActuel) {
      alert("⚠️ Tu dois être connecté pour ajouter un vol en favori !");
      return; 
    }

    const payload = {
      user_id: Number(idUtilisateurActuel),
      flight_id: String(flight.id),
      depart: String(departure), 
      arrivee: String(flight.arrivee || flight.arrival || "Inconnu"),
      jour: String(flight.horaire_depart || flight.day || flight.date || "Inconnu"),
      prix: Number(flight.prix || flight.price || 0),
      passagers: Number(flight.passagers || 1)
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert(`❤️ Vol vers ${payload.arrivee} à ${payload.prix}€ ajouté aux favoris !`);
      } else {
        const errorData = await response.json();
        if (response.status === 422) {
          alert("FastAPI a encore bloqué : regarde la console F12 !");
        } else {
          alert(errorData.message || "Ce vol est déjà dans tes favoris !");
        }
      }
    } catch (error) {
      console.error("Erreur de connexion :", error);
    }
  };

  const toggleGroup = (destination) => {
    setExpandedGroups(prev => ({
      ...prev,
      [destination]: !prev[destination]
    }));
  };

  const groupedResults = results.reduce((acc, flight) => {
    const dest = flight.arrivee;
    if (!acc[dest]) acc[dest] = [];
    acc[dest].push(flight);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Trouvez votre prochain vol ✈️</h1>

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

      <div style={{ marginTop: '40px' }}>
        {isLoading && <p style={{ textAlign: 'center' }}>Veuillez patienter, interrogation des compagnies aériennes...</p>}

        {!isLoading && results.length > 0 && (
          <div>
            <h3>Résultats trouvés ({results.length} vols) :</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {Object.entries(groupedResults).map(([destination, flights]) => (
                <div key={destination} style={{ border: '1px solid #007bff', borderRadius: '8px', overflow: 'hidden' }}>
                  
                  <div 
                    onClick={() => toggleGroup(destination)}
                    style={{ 
                      backgroundColor: '#e6f2ff', 
                      padding: '15px 20px', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: 'bold',
                      fontSize: '18px',
                      color: '#0056b3'
                    }}
                  >
                    <span>✈️ Vers {destination} <span style={{fontSize: '14px', color: '#666'}}>({flights.length} options)</span></span>
                    <span>{expandedGroups[destination] ? '🔼' : '🔽'}</span>
                  </div>

                  {expandedGroups[destination] && (
                    <div style={{ padding: '15px', backgroundColor: '#fdfdfd', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {flights.map((flight) => (
                        <div key={flight.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                          
                          <div>
                            <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>{departure} ➔ {flight.arrivee}</h4>
                            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                              Départ : {flight.horaire_depart} <br/> Arrivée : {flight.horaire_arrivee}
                            </p>

                            {/* 🟢 LA JAUGE D'ÉCORESPONSABILITÉ */}
                            {flight.emissions_co2 > 0 && (
                              <div style={{ 
                                marginTop: '8px',
                                display: 'inline-block', 
                                padding: '4px 8px', 
                                borderRadius: '6px', 
                                fontSize: '12px', 
                                fontWeight: 'bold',
                                backgroundColor: flight.emissions_higher ? '#fff3cd' : '#d4edda',
                                color: flight.emissions_higher ? '#856404' : '#155724',
                                border: `1px solid ${flight.emissions_higher ? '#ffeeba' : '#c3e6cb'}`
                              }}>
                                🍃 {flight.emissions_co2} kg CO2e 
                                {flight.emissions_diff > 0 && (
                                  <span> ({flight.emissions_higher ? '+' : '-'}{flight.emissions_diff}% vs moyenne)</span>
                                )}
                              </div>
                            )}

                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>{flight.prix} €</span>
                            <button onClick={() => handleLike(flight)} style={{ backgroundColor: '#ff4757', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                              ❤️ Liker
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}

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