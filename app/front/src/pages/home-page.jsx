import { useState, useEffect } from 'react';

const AIRPORT_CITIES = {
  "LHR": "Londres",
  "JFK": "New York",
  "LAX": "Los Angeles",
  "DXB": "Dubaï",
  "NRT": "Tokyo",
  "CDG": "Paris",
  "BCN": "Barcelone",
  "FCO": "Rome",
  "MAD": "Madrid",
  "SIN": "Singapour",
  "YUL": "Montréal",
  "MRS": "Marseille",
};

const getCityName = (code) => {
  const cleanCode = code?.split(' ')[0]; 
  return AIRPORT_CITIES[cleanCode] || cleanCode;
};

export default function HomePage() {
  const [searchMode, setSearchMode] = useState('solo');
  const [lastSearchMode, setLastSearchMode] = useState('solo'); 
  const [groupDepartures, setGroupDepartures] = useState(['', '']);

  const [soloDeparture, setSoloDeparture] = useState('');
  const [date, setDate] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [isDirect, setIsDirect] = useState(false);

  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState('price_asc');

  const [animationState, setAnimationState] = useState('idle');
  const [expandedDest, setExpandedDest] = useState(null);

  const [likedFlights, setLikedFlights] = useState(new Set());

  const getFlightSignature = (depart, arrivee, horaire) => {
    return `${depart}-${arrivee}-${horaire}`;
  };

  useEffect(() => {
    const fetchUserLikes = async () => {
      const userId = localStorage.getItem("user_id");
      if (!userId) return;

      try {
        const response = await fetch(`http://127.0.0.1:8000/likes/${userId}`);
        if (response.ok) {
          const data = await response.json();
          const likedIds = new Set(data.likes.map(like => like.flight_id));
          setLikedFlights(likedIds);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des favoris :", error);
      }
    };

    fetchUserLikes();
  }, []);

  const handleGroupDepChange = (index, value) => {
    const newDeps = [...groupDepartures];
    newDeps[index] = value.toUpperCase();
    setGroupDepartures(newDeps);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResults([]);
    setAnimationState('taking_off');

    await new Promise(resolve => setTimeout(resolve, 800));
    setAnimationState('searching');

    let url = 'http://127.0.0.1:8000/search-flights';
    let payload = {};

    if (searchMode === 'solo') {
      payload = {
        departure: soloDeparture.toUpperCase(),
        date,
        max_price: Number(maxPrice),
        passengers: Number(passengers),
        is_direct: isDirect
      };
    } else {
      url = 'http://127.0.0.1:8000/search-group-flights';
      payload = {
        departures: groupDepartures.filter(d => d.trim() !== ''),
        date,
        max_price: Number(maxPrice),
        passengers: Number(passengers),
        is_direct: isDirect
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      setResults(data.results || []);
      setLastSearchMode(searchMode);
      setAnimationState('landed');
    } catch (error) {
      console.error("Erreur de recherche", error);
      setAnimationState('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (flight) => {
    const idUtilisateurActuel = localStorage.getItem("user_id");
    if (!idUtilisateurActuel) return alert("⚠️ Tu dois être connecté pour sauvegarder un vol !");

    const signature = getFlightSignature(flight.depart, flight.arrivee, flight.horaire_depart);
    if (likedFlights.has(signature)) return;

    const payload = {
      user_id: Number(idUtilisateurActuel), flight_id: String(flight.id),
      depart: String(flight.depart), arrivee: String(flight.arrivee),
      jour: `${flight.horaire_depart}|${flight.horaire_arrivee}`, prix: Number(flight.prix), passagers: Number(passengers), eco_percent: flight.emissions_diff
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (response.ok) {
        setLikedFlights(prev => new Set(prev).add(signature));
      }
    } catch (error) { console.error("Erreur :", error); }
  };

  const resetSearch = () => {
    setAnimationState('idle');
    setResults([]);
    setExpandedDest(null);
  };

  const groupedResults = results.reduce((acc, flight) => {
    if (!acc[flight.arrivee]) acc[flight.arrivee] = [];
    acc[flight.arrivee].push(flight);
    return acc;
  }, {});

  const sortFlights = (flights) => {
    return [...flights].sort((a, b) => {
      if (sortBy === 'price_asc') return a.prix - b.prix;
      if (sortBy === 'price_desc') return b.prix - a.prix;
      if (sortBy === 'eco_asc') return (a.emissions_co2 || 99999) - (b.emissions_co2 || 99999);
      return 0;
    });
  };

  const getEcoImage = (percent) => {
    if (percent == null || percent <= 10) return '/eco-good.png';
    if (percent <= 75) return '/eco-medium.png';
    return '/eco-bad.png';
  };

  const extractTime = (dateStr) => {
    if (!dateStr) return "";
    const match = dateStr.match(/\d{1,2}:\d{2}(?:\s?[APM]{2})?/i);
    return match ? match[0] : dateStr;
  };

  // La jauge dynamique (Version 3 zones égales & Sans Tooltip)
  const renderDynamicGauge = (prix, stats) => {
    if (!stats || !stats.seuil_alerte_q3_mensuel) {
      return (
        <div className="flex flex-col items-center w-full max-w-[120px] mt-1">
          <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
            <div className="w-1/3 bg-[#4ade80] opacity-40"></div>
            <div className="w-1/3 bg-[#fbbf24] opacity-40"></div>
            <div className="w-1/3 bg-[#f87171] opacity-40"></div>
          </div>
          <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Données en cours</span>
        </div>
      );
    }

    const min = stats.prix_minimum_mensuel;
    const q1 = stats.seuil_bon_plan_q1_mensuel;
    const q3 = stats.seuil_alerte_q3_mensuel;
    const max = Math.max(stats.prix_maximum_mensuel, prix);

    let cursorPosition = 50; 

    if (prix <= min) {
      cursorPosition = 0;
    } else if (prix > min && prix <= q1) {
      const range = q1 - min || 1;
      cursorPosition = ((prix - min) / range) * 33.33;
    } else if (prix > q1 && prix <= q3) {
      const range = q3 - q1 || 1;
      cursorPosition = 33.33 + (((prix - q1) / range) * 33.33);
    } else {
      const range = max - q3 || 1;
      cursorPosition = 66.66 + (((prix - q3) / range) * 33.33);
    }

    cursorPosition = Math.max(0, Math.min(100, cursorPosition));

    return (
      <div className="flex flex-col items-center w-full max-w-[140px] mt-2 relative">
        <div className="relative w-full h-3 bg-slate-100 rounded-full shadow-inner flex overflow-hidden">
          <div className="bg-[#4ade80] w-1/3 h-full"></div>
          <div className="bg-[#fbbf24] w-1/3 h-full"></div>
          <div className="bg-[#f87171] w-1/3 h-full"></div>
        </div>
        <div 
          className="absolute top-[-4px] w-5 h-5 bg-[#262262] border-[3px] border-white rounded-full shadow-md z-10 transition-all duration-700 flex items-center justify-center pointer-events-none"
          style={{ left: `calc(${cursorPosition}% - 10px)` }}
        ></div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full font-sans flex flex-col overflow-x-hidden relative bg-[#f9f9fa]">

      <div
        className="fixed inset-0 z-0 blur-[4px] scale-105"
        style={{
          backgroundImage: 'url("/background.avif")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      ></div>

      <div className="relative z-10 w-full flex flex-col flex-1">

        {(animationState === 'idle' || animationState === 'taking_off') && (
          <div className="w-full flex flex-col items-center mt-12 px-4">

            <div className={`transition-all duration-700 text-center ${animationState === 'taking_off' ? 'opacity-0 scale-95' : 'opacity-100'}`}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl mt-28 font-black text-[#262262] tracking-tight leading-tight">
                Avec Comparat'air...<br />
                <span className="text-[#262262] opacity-80">seuls les prix restent à terre</span>
              </h1>
            </div>

            <div className={`relative w-full max-w-6xl mx-auto transition-all duration-[800ms] ease-in-out ${animationState === 'taking_off' ? 'translate-x-[150vw] -translate-y-48 scale-75 opacity-0' : 'translate-x-0 opacity-100'}`}>
              <img src="/plane.png" alt="Comparat'air Plane" className="w-full h-auto object-contain drop-shadow-xl pointer-events-none" />

              <form onSubmit={handleSearch} className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-full px-12 md:px-32">
                
                <div className="flex bg-white/30 backdrop-blur-md p-1 rounded-full shadow-sm mb-4">
                  <button type="button" onClick={() => setSearchMode('solo')} className={`px-5 py-1.5 rounded-full text-sm font-bold transition-all ${searchMode === 'solo' ? 'bg-white text-[#262262] shadow-sm' : 'text-white hover:bg-white/20'}`}>Solo</button>
                  <button type="button" onClick={() => setSearchMode('group')} className={`px-5 py-1.5 rounded-full text-sm font-bold transition-all ${searchMode === 'group' ? 'bg-white text-[#262262] shadow-sm' : 'text-white hover:bg-white/20'}`}>Groupe</button>
                </div>

                <div className="flex justify-center items-center gap-2 md:gap-3 w-full">
                  <div className="flex items-center bg-white rounded-xl md:rounded-2xl px-2 md:px-4 py-2 md:py-3 shadow-md flex-1 min-w-[150px] overflow-hidden">
                    <span className="text-[#9ca3af] font-medium text-[10px] md:text-sm italic mr-1 md:mr-2">From...</span>
                    
                    {searchMode === 'solo' ? (
                      <input type="text" value={soloDeparture} onChange={(e) => setSoloDeparture(e.target.value.toUpperCase())} className="w-full bg-transparent outline-none text-[#262262] font-black uppercase text-center text-xs md:text-base" maxLength={3} placeholder="CDG" required />
                    ) : (
                      <div className="flex gap-1 overflow-x-auto no-scrollbar items-center">
                        {groupDepartures.map((dep, idx) => (
                          <input key={idx} type="text" value={dep} onChange={(e) => handleGroupDepChange(idx, e.target.value)} className="w-10 md:w-14 bg-slate-100 rounded outline-none text-[#262262] font-black uppercase text-center text-xs md:text-base py-0.5" maxLength={3} placeholder="AER" required />
                        ))}
                        {groupDepartures.length < 4 && (
                          <button type="button" onClick={() => setGroupDepartures([...groupDepartures, ''])} className="bg-slate-200 hover:bg-slate-300 text-slate-600 rounded px-2 font-black transition-colors h-full pb-0.5">+</button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center bg-white rounded-xl md:rounded-2xl px-2 md:px-4 py-2 md:py-3 shadow-md flex-1 max-w-[150px]">
                    <span className="text-[#9ca3af] font-medium text-[10px] md:text-sm italic mr-1 md:mr-2">Prix max...</span>
                    <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full bg-transparent outline-none text-[#262262] font-black text-center text-xs md:text-base" min="10" placeholder="500" required />
                  </div>
                  <div className="flex items-center bg-white rounded-xl md:rounded-2xl px-2 md:px-4 py-2 md:py-3 shadow-md w-auto">
                    <input type="number" value={passengers} onChange={(e) => setPassengers(e.target.value)} className="w-6 md:w-8 bg-transparent outline-none text-[#262262] font-black text-center text-xs md:text-base" min="1" max="9" required />
                    <img src="/nbr.png" alt="Passagers" className="h-3 w-3 md:h-4 md:w-4 object-contain ml-1" />
                  </div>
                  <div className="flex items-center bg-white rounded-xl md:rounded-2xl px-2 md:px-4 py-2 md:py-3 shadow-md flex-1 max-w-[180px]">
                    <img src="/calendrier.png" alt="Calendrier" className="h-3 w-3 md:h-4 md:w-4 object-contain ml-1" />
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent outline-none text-[#262262] font-bold text-[10px] md:text-sm" required />
                  </div>
                  <button type="submit" disabled={isLoading} className="bg-[#6b66c7] hover:bg-[#837ed9] text-white p-2.5 md:p-4 rounded-xl md:rounded-2xl shadow-md transition-colors flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </button>
                </div>
              </form>
            </div>

            <div className={`mt-4 z-20 relative transition-opacity duration-500 ${animationState === 'taking_off' ? 'opacity-0' : 'opacity-100'}`}>
              <label className="flex items-center gap-3 cursor-pointer text-[#262262] font-bold text-sm bg-white shadow-sm px-6 py-3 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors">
                <input type="checkbox" checked={isDirect} onChange={(e) => setIsDirect(e.target.checked)} className="w-4 h-4 accent-[#262262] rounded" />
                Ligne directe uniquement
              </label>
            </div>
          </div>
        )}

        {(animationState === 'searching' || animationState === 'landed') && (
          <div className="w-full animate-[flyIn_0.5s_ease-out_forwards] flex flex-col items-start pb-20">

            <div className=" mt-28 ml-4 p-4 md:p-6 md:pr-8 flex flex-col lg:flex-row items-start lg:items-center gap-6 mb-10 w-full lg:w-auto">
              <div className="flex items-center gap-4 md:gap-6">
                <img src="/plane.png" alt="Mini avion" className="w-24 md:w-32 object-contain drop-shadow-md" />
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-[#262262]">
                    Vol depuis {lastSearchMode === 'solo' ? soloDeparture : groupDepartures.filter(d=>d).join(', ')}
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs md:text-sm font-bold">📅 {date}</span>
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs md:text-sm font-bold">👤 {passengers} Passager(s)</span>
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs md:text-sm font-bold">Max {maxPrice}€</span>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-8 flex justify-center lg:block">
                {animationState === 'searching' ? (
                  <div className="flex items-center gap-3 text-[#6b66c7] font-bold">
                    <div className="w-6 h-6 border-4 border-[#6b66c7] border-t-transparent rounded-full animate-spin"></div>
                    Recherche en cours...
                  </div>
                ) : (
                  <button onClick={resetSearch} className="text-[#6b66c7] bg-[#f0f0f5] px-6 py-3 rounded-xl font-bold transition-colors whitespace-nowrap">
                    Nouvelle recherche
                  </button>
                )}
              </div>
            </div>

            {animationState === 'landed' && (
              <div className="w-full animate-[fadeIn_0.5s_ease-out_forwards]">
                {results.length === 0 ? (
                  <div className="text-center p-12 bg-white/95 backdrop-blur-sm rounded-3xl shadow-sm w-full max-w-4xl mx-auto border border-slate-200">
                    <h3 className="text-2xl font-black text-[#262262]"> Aucun vol trouvé pour ces critères.</h3>
                  </div>
                ) : (
                  <div className="grid ml-6 grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full pr-6">
                    
                    {lastSearchMode === 'solo' ? (
                      Object.entries(groupedResults).map(([destination, flights]) => (
                        <div key={destination} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden w-full">

                          <div
                            onClick={() => setExpandedDest(expandedDest === destination ? null : destination)}
                            className="px-6 py-4 md:px-8 md:py-6 cursor-pointer flex justify-between items-center transition-colors group bg-[#dce0fc] hover:bg-[#cdd2fb]"
                          >
                            <div className="flex items-center gap-4 md:gap-10 w-full">
                              <div className="w-14 h-20 md:w-16 md:h-24 flex-shrink-0 rounded-[2rem] bg-transparent flex items-center justify-center border-[3px] border-[#c0c6f9] shadow-sm text-[#262262]">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>                            
                              </div>
                              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-16">
                                <div>
                                  <h3 className="text-2xl md:text-4xl font-black text-[#262262] tracking-tight">{getCityName(destination)}</h3>
                                  <p className="text-[10px] md:text-sm font-bold text-[#262262] uppercase tracking-wider mt-0.5">
                                    {soloDeparture || 'CDG'} - {destination.substring(0, 3)}
                                  </p>
                                </div>
                                <div className="text-xl md:text-3xl font-black text-[#262262]">
                                  {flights.length} Vol{flights.length > 1 ? 's' : ''} trouvé{flights.length > 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 md:h-12 md:w-12 text-[#262262] transition-transform duration-300 flex-shrink-0 ${expandedDest === destination ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>

                          <div className={`transition-all duration-500 ease-in-out bg-[#f9f9fa] ${expandedDest === destination ? 'max-h-[5000px] opacity-100 p-4 md:p-6' : 'max-h-0 opacity-0 overflow-hidden p-0'}`}>
                            <div className="flex justify-end mb-4">
                              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-white text-[#262262] font-bold py-2 px-4 rounded-lg border border-slate-200 outline-none shadow-sm cursor-pointer">
                                <option value="price_asc">Le moins cher</option>
                                <option value="price_desc">Le plus cher</option>
                                <option value="eco_asc">Éco-responsable</option>
                              </select>
                            </div>

                            <div className="flex flex-col gap-3">
                              {sortFlights(flights).map((flight) => {
                                const flightSignature = getFlightSignature(flight.depart, flight.arrivee, flight.horaire_depart);
                                return (
                                  <div key={flight.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col xl:flex-row justify-between items-center hover:bg-slate-50 transition-colors gap-6 xl:gap-4">
                                    <div className="w-16 h-10 flex-shrink-0 flex items-center justify-center">
                                      <img src={flight.airline_logo || '/plane.png'} alt="Airline" className="max-w-full max-h-full object-contain" />
                                    </div>
                                    <div className="hidden xl:block w-px h-10 bg-slate-200"></div>
                                    <div className="flex flex-col items-center xl:items-start text-center xl:text-left min-w-[120px]">
                                      <h4 className="text-xl font-black text-[#262262] leading-tight">{getCityName(destination)}</h4>
                                      <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                                        {flight.depart} - {destination.substring(0, 3)}
                                      </span>
                                    </div>
                                    <div className="hidden xl:block w-px h-10 bg-slate-200"></div>
                                    <div className="text-xl md:text-2xl font-black text-[#262262] text-center min-w-[160px]">
                                      {extractTime(flight.horaire_depart)} - <br className="xl:hidden" />
                                      {extractTime(flight.horaire_arrivee)}
                                    </div>
                                    <div className="hidden xl:block w-px h-10 bg-slate-200"></div>
                                    
                                    <div className="flex items-center justify-center gap-2 min-w-[90px]">
                                      <div className="text-[10px] font-black text-slate-800  tracking-widest [writing-mode:vertical-rl] rotate-180">
                                        CO2
                                      </div>
                                      <div className="flex flex-col items-center justify-center">
                                        <img src={getEcoImage(flight.emissions_diff)} alt="Eco" className="w-8 h-8 object-contain mb-1" />
                                        <span className="text-[10px] font-bold bg-[#8d9b81] text-white px-1.5 py-0.5 rounded shadow-sm">
                                          {flight.emissions_diff != null ? `${flight.emissions_diff} %` : "N/A"}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="hidden xl:block w-px h-10 bg-slate-200"></div>
                                    
                                    <div className="flex items-center gap-4 min-w-[140px]">
                                      <div className="flex flex-col items-center justify-center w-full">
                                        <span className="text-3xl font-black text-[#262262]">{flight.prix}€</span>
                                        {renderDynamicGauge(flight.prix, flight.stats)}
                                      </div>
                                    </div>
                                    
                                    <div className="hidden xl:block w-px h-10 bg-slate-200"></div>
                                    <button onClick={() => handleLike(flight)} className="hover:scale-110 transition-transform flex items-center justify-center min-w-[40px]" disabled={likedFlights.has(flightSignature)}>
                                      <img src={likedFlights.has(flightSignature) ? "/liked.png" : "/notlike.png"} alt="Like" className="w-6 h-6 md:w-8 md:h-8 object-contain" />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      results.map((combo, index) => {
                        const destination = combo.destination;
                        return (
                          <div key={index} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden w-full">
                            <div onClick={() => setExpandedDest(expandedDest === destination ? null : destination)} className="px-6 py-4 md:px-8 md:py-6 cursor-pointer flex justify-between items-center transition-colors group bg-[#dce0fc] hover:bg-[#cdd2fb]">
                              <div className="flex items-center gap-4 md:gap-10 w-full">
                                <div className="w-14 h-20 md:w-16 md:h-24 flex-shrink-0 rounded-[2rem] bg-transparent flex items-center justify-center border-[3px] border-[#c0c6f9] shadow-sm text-[#262262]">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-16">
                                  <div>
                                    <h3 className="text-2xl md:text-4xl font-black text-[#262262] tracking-tight">{getCityName(destination)}</h3>
                                    <p className="text-[10px] md:text-sm font-bold text-[#262262] uppercase tracking-wider mt-0.5">
                                      {combo.flights.map(f => f.depart).join(', ')} - {destination.substring(0, 3)}
                                    </p>
                                  </div>
                                  <div className="text-xl md:text-3xl font-black text-[#f97316]">
                                    {combo.total_price}€ <span className="text-sm font-black text-[#262262] block">AU TOTAL</span>
                                  </div>
                                </div>
                              </div>
                              <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 md:h-12 md:w-12 text-[#262262] transition-transform duration-300 flex-shrink-0 ${expandedDest === destination ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>

                            <div className={`transition-all duration-500 ease-in-out bg-[#f9f9fa] ${expandedDest === destination ? 'max-h-[5000px] opacity-100 p-4 md:p-6' : 'max-h-0 opacity-0 overflow-hidden p-0'}`}>
                              <div className="flex flex-col gap-3 mt-4">
                                {combo.flights.map((flight) => {
                                  const flightSignature = getFlightSignature(flight.depart, flight.arrivee, flight.horaire_depart);
                                  return (
                                    <div key={flight.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col xl:flex-row justify-between items-center hover:bg-slate-50 transition-colors gap-6 xl:gap-4 relative mt-2">
                                      
                                      <span className="absolute -top-3 left-4 bg-[#262262] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                        Vol depuis {flight.depart}
                                      </span>

                                      <div className="w-16 h-10 flex-shrink-0 flex items-center justify-center mt-2 xl:mt-0">
                                        <img src={flight.airline_logo || '/plane.png'} alt="Airline" className="max-w-full max-h-full object-contain" />
                                      </div>
                                      <div className="hidden xl:block w-px h-10 bg-slate-200"></div>
                                      <div className="flex flex-col items-center xl:items-start text-center xl:text-left min-w-[120px]">
                                        {/* 🎯 NOUVEAU : La ville */}
                                        <h4 className="text-xl font-black text-[#262262] leading-tight">{getCityName(destination)}</h4>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                                          {flight.depart} - {destination.substring(0, 3)}
                                        </span>
                                      </div>
                                      <div className="hidden xl:block w-px h-10 bg-slate-200"></div>
                                      <div className="text-xl md:text-2xl font-black text-[#262262] text-center min-w-[160px]">
                                        {extractTime(flight.horaire_depart)} - <br className="xl:hidden" />
                                        {extractTime(flight.horaire_arrivee)}
                                      </div>
                                      <div className="hidden xl:block w-px h-10 bg-slate-200"></div>
                                      
                                      <div className="flex items-center justify-center gap-2 min-w-[90px]">
                                        <div className="text-[10px] font-black text-slate-300 tracking-widest [writing-mode:vertical-rl] rotate-180">
                                          CO2
                                        </div>
                                        <div className="flex flex-col items-center justify-center">
                                          <img src={getEcoImage(flight.emissions_diff)} alt="Eco" className="w-8 h-8 object-contain mb-1" />
                                          <span className="text-[10px] font-bold bg-[#8d9b81] text-white px-1.5 py-0.5 rounded shadow-sm">
                                            {flight.emissions_diff != null ? `${flight.emissions_diff} %` : "N/A"}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="hidden xl:block w-px h-10 bg-slate-200"></div>
                                      
                                      <div className="flex items-center gap-4 min-w-[140px]">
                                        <div className="flex flex-col items-center justify-center w-full">
                                          <span className="text-3xl font-black text-[#262262]">{flight.prix}€</span>
                                          {renderDynamicGauge(flight.prix, flight.stats)}
                                        </div>
                                      </div>

                                      <div className="hidden xl:block w-px h-10 bg-slate-200"></div>
                                      <button onClick={() => handleLike(flight)} className="hover:scale-110 transition-transform flex items-center justify-center min-w-[40px]" disabled={likedFlights.has(flightSignature)}>
                                        <img src={likedFlights.has(flightSignature) ? "/liked.png" : "/notlike.png"} alt="Like" className="w-6 h-6 md:w-8 md:h-8 object-contain" />
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}