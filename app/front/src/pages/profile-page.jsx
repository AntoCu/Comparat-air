import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function ProfilePage({ setIsLoggedIn }) {
  const navigate = useNavigate();
  
  const [likesCount, setLikesCount] = useState(localStorage.getItem('likesCount') || "...");
  
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    const fetchLikesCount = async () => {
      const userId = localStorage.getItem("user_id");
      if (!userId) return;

      try {
        const response = await fetch(`http://127.0.0.1:8000/likes/${userId}`);
        if (response.ok) {
          const data = await response.json();
          const count = data.likes ? data.likes.length : 0;
          
          setLikesCount(count);
          localStorage.setItem('likesCount', count);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des favoris :", error);
      }
    };
    fetchLikesCount();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    navigate('/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });

    if (newPassword !== confirmPassword) {
      return setMessage({ text: "Les nouveaux mots de passe ne correspondent pas.", type: "error" });
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: Number(localStorage.getItem("user_id")), 
          old_password: oldPassword, 
          new_password: newPassword 
        }),
      });
      
      const data = await response.json();

      if (response.ok) {
        setMessage({ text: data.message, type: "success" });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsEditingMode(false);
          setMessage({ text: '', type: '' });
        }, 2000);
      } else {
        setMessage({ text: data.detail || "Erreur lors de la modification.", type: "error" });
      }
    } catch  {
      setMessage({ text: "Impossible de joindre le serveur.", type: "error" });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative font-sans bg-[#f9f9fa]">
      
      <div 
        className="fixed inset-0 z-0 blur-[4px] scale-105 pointer-events-none"
        style={{
          backgroundImage: 'url("/background.avif")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      ></div>

      <div 
        className="relative z-10 w-[460px] min-h-[520px] flex flex-col justify-between py-12 drop-shadow-2xl transition-all"
        style={{
          backgroundImage: 'url("/ticket-bg.png")', 
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <h2 className="text-3xl md:text-4xl font-black text-[#262262] mb-4 text-center mt-2">
          Profil
        </h2>
          
        <div className="flex flex-col items-center justify-start w-full flex-1 pl-[90px] pr-[30px] gap-4">

          {message.text && (
            <div className={`text-sm font-bold text-center w-full ${message.type === 'error' ? 'text-red-500' : 'text-green-600'}`}>
              {message.text}
            </div>
          )}

          {!isEditingMode ? (
            <>
              <div className="text-center w-full mt-2">
                <p className="text-2xl font-black text-[#f97316] uppercase tracking-wide">
                  {localStorage.getItem('name') || "Passager"}
                </p>
                <p className="text-[#6b66c7] font-bold text-sm italic mt-1">
                  {localStorage.getItem('email')}
                </p>
              </div>

              <div className="w-full bg-[#f4f7fc] border border-[#262262]/20 rounded-xl px-4 py-4 text-center shadow-inner mt-2">
                <p className="text-[#262262] font-black text-sm uppercase mb-1">Vols en favoris</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl font-black text-[#f97316]">{likesCount}</span>
                  <img src="/Like.png" alt="Cœur" className="w-6 h-6 object-contain opacity-80" />
                </div>
              </div>

              <button 
                onClick={() => setIsEditingMode(true)}
                className="text-[#6b66c7] hover:text-[#262262] font-bold text-sm underline transition-colors mt-2"
              >
                Modifier le mot de passe
              </button>
            </>
          ) : (
            <form onSubmit={handleChangePassword} className="flex flex-col gap-3 w-full mt-2">
              <input
                type="password"
                placeholder="Ancien mot de passe"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="w-full bg-[#f4f7fc] border border-[#262262]/30 rounded-xl px-4 py-2.5 text-center text-xs font-bold text-[#6b66c7] italic shadow-inner outline-none focus:border-[#f97316]"
              />
              <input
                type="password"
                placeholder="Nouveau mot de passe"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full bg-[#f4f7fc] border border-[#262262]/30 rounded-xl px-4 py-2.5 text-center text-xs font-bold text-[#6b66c7] italic shadow-inner outline-none focus:border-[#f97316]"
              />
              <input
                type="password"
                placeholder="Confirmer nouveau"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-[#f4f7fc] border border-[#262262]/30 rounded-xl px-4 py-2.5 text-center text-xs font-bold text-[#6b66c7] italic shadow-inner outline-none focus:border-[#f97316]"
              />
              
              <div className="flex gap-2 mt-1">
                <button 
                  type="button" 
                  onClick={() => setIsEditingMode(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold py-2 px-2 rounded-xl text-xs flex-1 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="bg-[#262262] hover:bg-[#322d7a] text-white font-bold py-2 px-2 rounded-xl text-xs flex-1 transition-colors shadow-md"
                >
                  Valider
                </button>
              </div>
            </form>
          )}
          
        </div>

        <div className="w-full pl-[90px] pr-[30px] my-5">
          <div className="border-t-[2px] border-dashed border-[#a5a2d1]/60 w-full"></div>
        </div>

        <div className="flex justify-center gap-4 pl-[90px] pr-[30px] pb-1">
          <Link 
            to="/likes" 
            className="bg-[#f97316] hover:bg-[#e06511] text-white font-bold py-3 px-2 rounded-xl transition-transform hover:scale-105 shadow-md flex-1 text-center text-sm flex items-center justify-center"
          >
            Voir mes favoris
          </Link>
          <button 
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-2 rounded-xl transition-transform hover:scale-105 shadow-md flex-1 text-sm text-center"
          >
            Déconnexion
          </button>
        </div>

      </div>
    </div>
  );
}