import { useState } from 'react';

export default function HomePage() {
  const [isGroupMode, setIsGroupMode] = useState(false);
  
  // États de recherche
  const [soloDeparture, setSoloDeparture] = useState('CDG');
  const [groupDepartures, setGroupDepartures] = useState(['CDG', 'MRS']); // Tableau dynamique !
  
  const [date, setDate] = useState('');
  const [maxPrice, setMaxPrice] = useState(500);
  const [passengers, setPassengers] = useState(1);
  const [isDirect, setIsDirect] = useState(false);
  
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [sortBy, setSortBy] = useState('price_asc');

  // --- GESTION DES DÉPARTS DE GROUPE ---
  const handleGroupDepChange = (index, value) => {
    const newDeps = [...groupDepartures];
    newDeps[index] = value.toUpperCase();
    setGroupDepartures(newDeps);
  };

  const addGroupDeparture = () => {
    if (groupDepartures.length < 4) {
      setGroupDepartures([...groupDepartures, '']);
    }
  };

  const removeGroupDeparture = (index) => {
    if (groupDepartures.length > 2) {
      setGroupDepartures(groupDepartures.filter((_, i) => i !== index));
    }
  };
  // ------------------------------------

  const handleSearch = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResults([]);
    setExpandedGroups({});

    const endpoint = isGroupMode ? 'search-group-flights' : 'search-flights';
    const payload = isGroupMode 
      ? {
          departures: groupDepartures.filter(dep => dep.trim() !== ''), // On envoie le tableau au backend !
          date: date,
          max_price: Number(maxPrice),
          is_direct: isDirect
        }
      : {
          departure: soloDeparture,
          date: date,
          max_price: Number(maxPrice),
          passengers: Number(passengers),
          is_direct: isDirect
        };

    try {
      const response = await fetch(`http://127.0.0.1:8000/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    const idUtilisateurActuel = localStorage.getItem("user_id");
    if (!idUtilisateurActuel) {
      alert("⚠️ Tu dois être connecté pour ajouter un vol en favori !");
      return; 
    }

    const payload = {
      user_id: Number(idUtilisateurActuel),
      flight_id: String(flight.id),
      depart: String(flight.depart || "Inconnu"), // Le backend nous fournit le départ exact !
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
      if (response.ok) alert(`❤️ Vol vers ${payload.arrivee} à ${payload.prix}€ ajouté aux favoris !`);
      else {
        const errorData = await response.json();
        alert(errorData.message || "Ce vol est déjà dans tes favoris !");
      }
    } catch (error) {
      console.error("Erreur :", error);
    }
  };

  const toggleGroup = (destination) => setExpandedGroups(prev => ({ ...prev, [destination]: !prev[destination] }));

  const getEcoStyle = (isHigher, diffPercent) => {
    if (!isHigher) return { bg: '#d4edda', text: '#155724', border: '#c3e6cb' };
    if (diffPercent <= 25) return { bg: '#fff3cd', text: '#856404', border: '#ffeeba' };
    return { bg: '#f8d7da', text: '#721c24', border: '#f5c6cb' };
  };

  const sortedSoloResults = !isGroupMode ? [...results].sort((a, b) => {
    if (sortBy === 'price_asc') return a.prix - b.prix;
    if (sortBy === 'price_desc') return b.prix - a.prix;
    if (sortBy === 'eco_asc') return (a.emissions_co2 || 99999) - (b.emissions_co2 || 99999);
    if (sortBy === 'eco_desc') return (b.emissions_co2 || 0) - (a.emissions_co2 || 0);
    return 0;
  }) : [];

  const groupedSoloResults = sortedSoloResults.reduce((acc, flight) => {
    const dest = flight.arrivee;
    if (!acc[dest]) acc[dest] = [];
    acc[dest].push(flight);
    return acc;
  }, {});

  const FlightCard = ({ flight }) => {
    const ecoStyle = getEcoStyle(flight.emissions_higher, flight.emissions_diff);
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '10px' }}>
        <div>
          <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>{flight.depart} ➔ {flight.arrivee}</h4>
          <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Départ : {flight.horaire_depart} <br/> Arrivée : {flight.horaire_arrivee}</p>
          {flight.emissions_co2 > 0 && (
            <div style={{ marginTop: '8px', display: 'inline-block', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', backgroundColor: ecoStyle.bg, color: ecoStyle.text, border: `1px solid ${ecoStyle.border}` }}>
              🍃 {flight.emissions_co2} kg CO2e {flight.emissions_diff > 0 && <span> ({flight.emissions_higher ? '+' : '-'}{flight.emissions_diff}% vs moy)</span>}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>{flight.prix} €</span>
          <button onClick={() => handleLike(flight)} style={{ backgroundColor: '#ff4757', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>❤️ Liker</button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Trouvez votre prochain vol ✈️</h1>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <button onClick={() => setIsGroupMode(!isGroupMode)} style={{ padding: '10px 20px', backgroundColor: isGroupMode ? '#28a745' : '#6c757d', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isGroupMode ? "👯 Mode Groupe Activé" : "👤 Mode Solo"}
        </button>
      </div>

      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
        <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>

          {/* AFFICHAGE DES CHAMPS SELON LE MODE */}
          {isGroupMode ? (
            <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontWeight: 'bold' }}>Aéroports de départ de votre groupe :</label>
              {groupDepartures.map((dep, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" value={dep} onChange={(e) => handleGroupDepChange(index, e.target.value)} maxLength={3} placeholder={`Ex: CDG`} required style={{ flexGrow: 1, padding: '8px' }} />
                  {groupDepartures.length > 2 && (
                    <button type="button" onClick={() => removeGroupDeparture(index)} style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>❌</button>
                  )}
                </div>
              ))}
              {groupDepartures.length < 4 && (
                <button type="button" onClick={addGroupDeparture} style={{ padding: '8px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', alignSelf: 'flex-start' }}>➕ Ajouter une personne</button>
              )}
            </div>
          ) : (
            <>
              <div>
                <label>Aéroport de départ :</label>
                <input type="text" value={soloDeparture} onChange={(e) => setSoloDeparture(e.target.value.toUpperCase())} maxLength={3} required style={{ width: '100%', padding: '8px' }} />
              </div>
              <div>
                <label>Passagers :</label>
                <input type="number" value={passengers} onChange={(e) => setPassengers(e.target.value)} min="1" max="9" required style={{ width: '100%', padding: '8px' }} />
              </div>
            </>
          )}

          <div>
            <label>Date de départ :</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
          </div>

          <div>
            <label>{isGroupMode ? "Budget Total Max (€) :" : "Prix maximum (€) :"}</label>
            <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} min="10" required style={{ width: '100%', padding: '8px' }} />
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
            <input type="checkbox" id="directCheck" checked={isDirect} onChange={(e) => setIsDirect(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
            <label htmlFor="directCheck" style={{ fontWeight: 'bold', cursor: 'pointer', color: '#333' }}>Vols directs uniquement ✈️</label>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Résultats trouvés ({isGroupMode ? results.length + " destinations possibles" : results.length + " vols"}) :</h3>
              
              {!isGroupMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontWeight: 'bold', color: '#555', fontSize: '14px' }}>Trier par :</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '8px 12px', borderRadius: '5px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer', outline: 'none' }}>
                    <option value="price_asc">Prix : Moins cher en premier</option>
                    <option value="price_desc">Prix : Plus cher en premier</option>
                    <option value="eco_asc">Éco : Moins polluant en premier</option>
                    <option value="eco_desc">Éco : Plus polluant en premier</option>
                  </select>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {/* AFFICHAGE MODE GROUPE */}
              {isGroupMode && results.map((combo, index) => (
                <div key={index} style={{ border: '2px solid #28a745', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#d4edda', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '18px', color: '#155724' }}>
                    <span>📍 Point de rencontre : {combo.destination}</span>
                    <span>Total pour {combo.flights.length} : {combo.total_price} €</span>
                  </div>
                  <div style={{ padding: '15px', backgroundColor: '#fdfdfd' }}>
                    {/* On boucle sur les vols de la combinaison ! */}
                    {combo.flights.map((flight, flightIndex) => (
                      <div key={flightIndex}>
                        <h5 style={{ margin: '15px 0 5px 0', color: '#007bff' }}>Vol de la Personne {flightIndex + 1} ({flight.depart})</h5>
                        <FlightCard flight={flight} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* AFFICHAGE MODE SOLO */}
              {!isGroupMode && Object.entries(groupedSoloResults).map(([destination, flights]) => (
                <div key={destination} style={{ border: '1px solid #007bff', borderRadius: '8px', overflow: 'hidden' }}>
                  <div onClick={() => toggleGroup(destination)} style={{ backgroundColor: '#e6f2ff', padding: '15px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '18px', color: '#0056b3' }}>
                    <span>✈️ Vers {destination} <span style={{fontSize: '14px', color: '#666'}}>({flights.length} options)</span></span>
                    <span>{expandedGroups[destination] ? '🔼' : '🔽'}</span>
                  </div>
                  {expandedGroups[destination] && (
                    <div style={{ padding: '15px', backgroundColor: '#fdfdfd', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {flights.map((flight) => (
                        <FlightCard key={flight.id} flight={flight} />
                      ))}
                    </div>
                  )}
                </div>
              ))}

            </div>
          </div>
        )}

        {!isLoading && results.length === 0 && date !== '' && (
          <p style={{ textAlign: 'center', color: '#666' }}>Aucune combinaison trouvée sous ce budget pour cette date.</p>
        )}
      </div>
    </div>
  );
}