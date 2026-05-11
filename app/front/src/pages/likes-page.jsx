import { useState, useEffect } from 'react';

export default function LikesPage() {
  const [likedFlights, setLikedFlights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  const fetchLikes = async () => {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/likes/${userId}`);
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
      const response = await fetch(`http://127.0.0.1:8000/refresh-likes/${userId}`, {
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
    const match = dateStr.match(/\d{1,2}:\d{2}(?:\s?[APM]{2})?/i);
    return match ? match[0] : dateStr;
  };

  const getEcoImage = (percent) => {
    if (percent == null || percent <= 10) return '/eco-good.png';
    if (percent <= 75) return '/eco-medium.png';
    return '/eco-bad.png';
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
            ⚠️ Tu dois être connecté pour voir tes favoris !
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
              className={`font-bold py-3 px-6 rounded-xl transition-all shadow-md text-sm md:text-base flex items-center gap-2 ${isRefreshing
                  ? 'bg-slate-400 cursor-not-allowed text-white'
                  : 'bg-[#f97316] hover:bg-[#e06511] hover:scale-105 text-white cursor-pointer'
                }`}
            >
              {isRefreshing && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isRefreshing ? "Actualisation..." : "🔄 Actualiser les prix"}
            </button>
          )}
        </div>

        {/* Affichage des résultats */}
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 text-[#262262] bg-white/90 backdrop-blur-sm px-6 py-4 rounded-full shadow-md font-bold text-lg max-w-sm mx-auto mt-12">
            <div className="w-6 h-6 border-4 border-[#262262] border-t-transparent rounded-full animate-spin"></div>
            Chargement de tes pépites...
          </div>
        ) : likedFlights.length === 0 ? (
          <div className="text-center p-12 bg-white/95 backdrop-blur-sm rounded-3xl shadow-md border border-slate-200">
            <h3 className="text-2xl font-black text-[#262262]">Tu n'as pas encore ajouté de vols à tes favoris </h3>
            <p className="text-slate-500 font-bold mt-2">Retourne à la recherche pour dénicher les meilleurs prix !</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {likedFlights.map((flight) => (
              <div key={flight.id} className="bg-white rounded-2xl p-4 md:p-5 shadow-lg border border-slate-100 flex flex-col xl:flex-row justify-between items-center hover:bg-slate-50 transition-colors gap-6 xl:gap-4">

                <div className="w-16 h-10 flex-shrink-0 flex items-center justify-center opacity-60">
                  <img src="/plane.png" alt="Airline" className="max-w-full max-h-full object-contain" />
                </div>

                <div className="hidden xl:block w-px h-10 bg-slate-200"></div>

                <div className="flex flex-col items-center xl:items-start text-center xl:text-left min-w-[140px]">
                  <h4 className="text-2xl font-black text-[#262262] leading-tight">
                    {flight.arrivee.split(' ')[0]}
                  </h4>
                  <span className="text-[10px] font-bold text-[#262262] opacity-70 uppercase mt-1 tracking-wider">
                    {flight.depart} - {flight.arrivee.substring(0, 3)}
                  </span>
                </div>

                <div className="hidden xl:block w-px h-10 bg-slate-200"></div>

                <div className="text-2xl md:text-3xl font-black text-[#262262] text-center min-w-[160px]">
                  {extractTime(flight.jour.split('|')[0])}

                  {flight.jour.split('|')[1] && (
                    <>
                      <span> - </span><br className="xl:hidden" />
                      {extractTime(flight.jour.split('|')[1])}
                    </>
                  )}
                </div>

                <div className="hidden xl:block w-px h-10 bg-slate-200"></div>

                <div className="flex flex-col items-center justify-center min-w-[70px]">
                  <img src={getEcoImage(flight.eco_percent)} alt="Eco" className="w-10 h-10 object-contain mb-1" />
                  <span className="text-[10px] font-bold bg-[#8d9b81] text-white px-1.5 py-0.5 rounded shadow-sm">
                    {flight.eco_percent != null ? `${flight.eco_percent} %` : "N/A"}
                  </span>
                </div>

                <div className="hidden xl:block w-px h-10 bg-slate-200"></div>

                <div className="flex flex-col items-center justify-center min-w-[140px]">
                  <span className="text-3xl md:text-4xl font-black text-[#262262]">{flight.prix}€</span>
                  <div className="relative w-full max-w-[80px] h-1.5 rounded-full mt-2 flex bg-slate-100 overflow-hidden shadow-inner">
                    <div className="bg-[#4ade80] h-full w-1/3"></div>
                    <div className="bg-[#fbbf24] h-full w-1/3"></div>
                    <div className="bg-[#f87171] h-full w-1/3"></div>
                    <div className="absolute top-0 h-full w-1.5 bg-[#262262] rounded-full" style={{ left: '30%' }}></div>
                  </div>
                </div>

                <div className="hidden xl:block w-px h-10 bg-slate-200"></div>

                <div className="flex items-center justify-center min-w-[40px] cursor-default">
                  <img
                    src="/liked.png"
                    alt="Liked"
                    className="w-8 h-8 md:w-10 md:h-10 object-contain"
                  />
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}