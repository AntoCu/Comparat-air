import { useState, useEffect } from 'react';
import { API_URL } from '../config';
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

export default function LikesPage() {
  const [likedFlights, setLikedFlights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  const fetchLikes = async () => {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;

    try {
      const response = await fetch(`${API_URL}/likes/${userId}`);
      const data = await response.json();

      if (response.ok) {
        setLikedFlights(data.likes || []);
      }
    } catch (error) {
      console.error("Impossible de joindre le serveur", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlike = async (flightId) => {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;

    try {
      const response = await fetch(`${API_URL}/likes/${userId}/${flightId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setLikedFlights(currentFlights => currentFlights.filter(flight => flight.id !== flightId));
      } else {
        alert("Erreur lors de la suppression du favori.");
      }
    } catch (error) {
      console.error("Erreur serveur :", error);
      alert("Impossible de contacter le serveur.");
    }
  };

  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (!userId) {
      setIsLoggedIn(false);
      setIsLoading(false);
      return;
    }
    fetchLikes();
  }, []);

  const handleRefreshPrices = async () => {
    const userId = localStorage.getItem("user_id");
    setIsRefreshing(true);

    try {
      const response = await fetch(`${API_URL}/refresh-likes/${userId}`, {
        method: 'POST'
      });
      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        await fetchLikes();
      } else {
        alert("Erreur lors de la mise à jour des prix.");
      }
    } catch (error) {
      console.error("Erreur serveur :", error);
      alert("Impossible de contacter le serveur pour rafraîchir.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const extractTime = (dateStr) => {
    if (!dateStr) return "N/A";

    const match = dateStr.match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i);
    if (!match) return dateStr;

    let [_, hours, minutes, ampm] = match;
    hours = parseInt(hours, 10);

    if (ampm) {
      ampm = ampm.toUpperCase();
      if (ampm === 'PM' && hours < 12) {
        hours += 12;
      } else if (ampm === 'AM' && hours === 12) {
        hours = 0;
      }
    }

    const formattedHours = hours.toString().padStart(2, '0');

    return `${formattedHours}:${minutes}`;
  };

  const extractDate = (dateStr) => {
    if (!dateStr) return "";
    return dateStr.split(' ')[0];
  };

  const getEcoImage = (percent) => {
    if (percent == null || percent <= 10) return '/eco-good.png';
    if (percent <= 75) return '/eco-medium.png';
    return '/eco-bad.png';
  };

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

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center relative font-sans bg-[#f9f9fa]">
        <div
          className="fixed inset-0 z-0 blur-[4px] scale-105 pointer-events-none"
          style={{
            backgroundImage: 'url("/background.avif")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>
        <div className="relative z-10 bg-white/95 backdrop-blur-sm p-8 rounded-3xl shadow-xl text-center border border-slate-200">
          <h2 className="text-3xl font-black text-[#262262] mb-4">Mes Vols Favoris ❤️</h2>
          <p className="text-red-500 font-bold text-lg">
            Tu dois être connecté pour voir tes favoris !
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full font-sans flex flex-col overflow-x-hidden relative pt-32 pb-20 bg-[#f9f9fa]">
      <div
        className="fixed inset-0 z-0 blur-[4px] scale-105 pointer-events-none"
        style={{
          backgroundImage: 'url("/background.avif")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      ></div>

      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 relative z-10 flex flex-col flex-1">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <h2 className="text-3xl md:text-5xl font-black text-[#262262] drop-shadow-sm">
            Vos coups de coeur
          </h2>

          {likedFlights.length > 0 && (
            <button
              onClick={handleRefreshPrices}
              disabled={isRefreshing}
              className={`font-bold py-3 px-6 rounded-xl transition-all shadow-md text-sm md:text-base flex items-center gap-2 
                ${isRefreshing
                  ? 'bg-slate-300 cursor-not-allowed text-gray-600'
                  : 'bg-[#262262] hover:bg-[#322d7a] text-white hover:scale-105 active:scale-95'
                }`}
            >
              {isRefreshing && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isRefreshing ? "Actualisation..." : " Actualiser les prix"}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 text-[#262262] bg-white/90 backdrop-blur-sm px-6 py-4 rounded-full shadow-md font-bold text-lg max-w-sm mx-auto mt-12">
            <div className="w-6 h-6 border-4 border-[#262262] border-t-transparent rounded-full animate-spin"></div>
            Chargement de tes likes...
          </div>
        ) : likedFlights.length === 0 ? (
          <div className="text-center p-12 bg-white/95 backdrop-blur-sm rounded-3xl shadow-md border border-slate-200">
            <h3 className="text-2xl font-black text-[#262262]">Tu n'as pas encore ajouté de vols à tes favoris </h3>
            <p className="text-slate-500 font-bold mt-2">Retourne à la recherche pour dénicher les meilleurs prix !</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {likedFlights.map((flight) => (
              <div key={flight.id} className="bg-white rounded-2xl p-4 md:p-5 shadow-lg border border-slate-100 flex flex-col xl:flex-row xl:justify-between items-center hover:bg-slate-50 transition-colors gap-2.5 xl:gap-4 w-full">

                <div className="flex flex-col items-center xl:items-start text-center xl:text-left min-w-[140px] w-full xl:w-auto pb-2.5 xl:pb-0 border-b border-dashed border-slate-200 xl:border-none">
                  <h4 className="text-2xl font-black text-[#262262] leading-tight">
                    {getCityName(flight.arrivee)}
                  </h4>
                  <span className="text-[10px] font-bold text-[#262262] opacity-70 uppercase mt-1 tracking-wider">
                    {flight.depart} - {flight.arrivee.substring(0, 3)}
                  </span>
                </div>

                <div className="hidden xl:block w-px h-10 bg-slate-200"></div>

                <div className="flex flex-row justify-center items-center w-full xl:w-auto px-4 xl:px-0 gap-6 sm:gap-12 xl:gap-0 xl:contents">

                  <div className="flex flex-col items-center justify-center w-[140px] xl:w-auto xl:min-w-[160px]">
                    <div className="flex flex-col items-center text-center">
                      <span className="text-[10px] font-bold text-[#f97316] uppercase tracking-wider mb-[-2px]">
                        {extractDate(flight.jour.split('|')[0])}
                      </span>
                      <span className="text-2xl md:text-3xl font-black text-[#262262]">
                        {extractTime(flight.jour.split('|')[0])}
                      </span>
                    </div>

                    {flight.jour.split('|')[1] && (
                      <>
                        <div className="w-1 h-3 bg-slate-200 rounded-full my-1 self-center"></div>

                        <div className="flex flex-col items-center text-center">
                          <span className="text-[10px] font-bold text-[#f97316] uppercase tracking-wider mb-[-2px]">
                            {extractDate(flight.jour.split('|')[1])}
                          </span>
                          <span className="text-2xl md:text-3xl font-black text-[#262262]">
                            {extractTime(flight.jour.split('|')[1])}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="hidden xl:block w-px h-10 bg-slate-200"></div>

                  <div className="flex items-center justify-center gap-2 w-[80px] xl:w-auto xl:min-w-[90px]">
                    <div className="text-[10px] font-black text-slate-800 tracking-widest [writing-mode:vertical-rl] rotate-180">
                      CO2
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <img src={getEcoImage(flight.eco_percent)} alt="Eco" className="w-10 h-10 object-contain mb-1" />
                      <span className="text-[10px] font-bold bg-[#8d9b81] text-white px-1.5 py-0.5 rounded shadow-sm">
                        {flight.eco_percent != null ? `${flight.eco_percent} %` : "N/A"}
                      </span>
                    </div>
                  </div>

                </div>

                <div className="hidden xl:block w-px h-10 bg-slate-200"></div>

                <div className="flex flex-row justify-center items-center w-full xl:w-auto px-4 xl:px-0 pt-2 xl:pt-0 gap-6 sm:gap-12 xl:gap-0 xl:contents">

                  <div className="flex flex-col items-center justify-center w-[140px] xl:w-auto xl:min-w-[140px]">
                    <span className="text-3xl md:text-4xl font-black text-[#262262]">{flight.prix}€</span>
                    {renderDynamicGauge(flight.prix, flight.stats)}
                  </div>

                  <div className="hidden xl:block w-px h-10 bg-slate-200"></div>

                  <div className="flex justify-center items-center w-[80px] xl:w-auto xl:min-w-[40px]">
                    <button
                      onClick={() => handleUnlike(flight.id)}
                      title="Retirer des favoris"
                      className="cursor-pointer hover:scale-110 active:scale-95 transition-transform hover:opacity-70"
                    >
                      <img
                        src="/liked.png"
                        alt="Liked"
                        className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-sm"
                      />
                    </button>
                  </div>

                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}