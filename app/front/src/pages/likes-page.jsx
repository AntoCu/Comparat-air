import { useState, useEffect } from 'react';

export default function LikesPage() {
  const [likedFlights, setLikedFlights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // Nouvel état pour le bouton refresh
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // On sort la fonction fetchLikes du useEffect pour pouvoir la rappeler après un refresh !
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

  // --- NOUVELLE FONCTION DE RAFRAÎCHISSEMENT ---
  const handleRefreshPrices = async () => {
    const userId = localStorage.getItem("user_id");
    setIsRefreshing(true); // Fait tourner le bouton

    try {
      const response = await fetch(`http://127.0.0.1:8000/refresh-likes/${userId}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (response.ok) {
        alert(data.message); // Affiche "X prix actualisés"
        await fetchLikes();  // Recharge la liste pour afficher les nouveaux prix !
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

  if (!isLoggedIn) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h2>Mes Vols Favoris ❤️</h2>
        <p style={{ color: '#ff4757', fontWeight: 'bold' }}>
          ⚠️ Tu dois être connecté pour voir tes favoris !
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      
      {/* En-tête avec le Titre ET le Bouton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>Mes Vols Favoris ❤️</h2>
        
        {likedFlights.length > 0 && (
          <button 
            onClick={handleRefreshPrices} 
            disabled={isRefreshing}
            style={{ 
              backgroundColor: isRefreshing ? '#ccc' : '#007bff', 
              color: 'white', 
              border: 'none', 
              padding: '10px 15px', 
              borderRadius: '5px', 
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isRefreshing ? "⏳ Actualisation en cours..." : "🔄 Actualiser les prix"}
          </button>
        )}
      </div>
      
      {isLoading ? (
        <p style={{ textAlign: 'center' }}>Chargement de tes pépites...</p>
      ) : likedFlights.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
          Tu n'as pas encore ajouté de vols à tes favoris. 
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {likedFlights.map((flight) => (
            <div key={flight.id} style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              border: '1px solid #ddd', padding: '15px', borderRadius: '8px', 
              backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' 
            }}>
              <div>
                <h4 style={{ margin: '0 0 5px 0', color: '#333' }}>
                  {flight.depart} ➔ {flight.arrivee}
                </h4>
                <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                  Date du vol : {flight.jour}
                </p>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: '#666', display: 'block' }}>Dernier prix vu</span>
                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>{flight.prix} €</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}