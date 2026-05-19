import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Header({ isLoggedIn, handleLogout }) {
  const isAdmin = localStorage.getItem('role') === 'admin';
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogoutClick = () => {
    handleLogout();
    closeMenu(); 
  };

  return (
    <div className="w-full absolute top-6 z-50 flex justify-center px-4 md:px-8">
      <nav className="relative w-full max-w-7xl bg-white/95 backdrop-blur-md shadow-lg flex justify-between items-center px-6 md:px-10 py-3 md:py-4 rounded-3xl border border-slate-200">
        
        <Link to="/" onClick={closeMenu} className="hover:opacity-80 transition-opacity flex items-center gap-2">
          <img src="/logo.png" alt="Comparat'air Logo" className="h-8 md:h-12 object-contain" />
        </Link>
        <div className="hidden md:flex items-center gap-8">

          {isLoggedIn && isAdmin && (
            <Link 
              to="/dashboard" 
              className="flex items-center gap-2 text-[#262262] font-black hover:opacity-70 transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" className="w-8 h-8">
                <path d="M120-120v-80h720v80H120Zm160-160v-400h120v400H280Zm240 0v-240h120v240H520Z"/>
              </svg>
              <span>Admin</span>
            </Link>
          )}

          <Link to={isLoggedIn ? "/likes" : "/login"} className="flex items-center gap-2 text-[#262262] font-bold hover:opacity-70 transition-opacity">
            <img src="/Like.png" alt="Favoris" className="h-8 object-contain" />
            <span>Favoris</span>
          </Link>

          <Link to={isLoggedIn ? "/profile" : "/login"} className="flex items-center gap-2 text-[#262262] font-bold hover:opacity-70 transition-opacity">
            <img src="/Profil.png" alt="Profil" className="h-8 object-contain" />
            <span>Profil</span>
          </Link>

          <div className="h-8 w-px bg-slate-300 mx-2"></div>

          {isLoggedIn ? (
            <button 
              onClick={handleLogoutClick} 
              className="text-red-500 hover:text-red-600 font-bold text-base hover:underline transition-all"
            >
              Déconnexion
            </button>
          ) : (
            <Link 
              to="/login"
              className="text-[#f97316] hover:text-[#e06511] font-bold text-base hover:underline transition-all"
            >
              Se connecter
            </Link>
          )}
        </div>

        <button 
          onClick={toggleMenu}
          className="md:hidden flex items-center justify-center p-2 text-[#262262] focus:outline-none hover:bg-slate-100 rounded-xl transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {isMenuOpen && (
          <div className="absolute top-[110%] right-0 mt-2 w-56 bg-white/95 backdrop-blur-md shadow-xl rounded-2xl p-5 flex flex-col gap-5 border border-slate-200 md:hidden animate-[fadeIn_0.2s_ease-out]">
            
            {isLoggedIn && isAdmin && (
              <Link onClick={closeMenu} to="/dashboard" className="flex items-center gap-3 text-[#262262] font-black hover:opacity-70 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" className="w-6 h-6">
                  <path d="M120-120v-80h720v80H120Zm160-160v-400h120v400H280Zm240 0v-240h120v240H520Z"/>
                </svg>
                <span>Dashboard Admin</span>
              </Link>
            )}

            <Link onClick={closeMenu} to={isLoggedIn ? "/likes" : "/login"} className="flex items-center gap-3 text-[#262262] font-bold hover:opacity-70 transition-opacity">
              <img src="/Like.png" alt="Favoris" className="h-6 object-contain" />
              <span>Mes Favoris</span>
            </Link>

            <Link onClick={closeMenu} to={isLoggedIn ? "/profile" : "/login"} className="flex items-center gap-3 text-[#262262] font-bold hover:opacity-70 transition-opacity">
              <img src="/Profil.png" alt="Profil" className="h-6 object-contain" />
              <span>Mon Profil</span>
            </Link>

            <div className="h-px w-full bg-slate-200"></div>

            {isLoggedIn ? (
              <button 
                onClick={handleLogoutClick} 
                className="text-left text-red-500 hover:text-red-600 font-bold text-sm transition-all flex items-center gap-3"
              >
                Déconnexion
              </button>
            ) : (
              <Link 
                onClick={closeMenu}
                to="/login"
                className="text-left text-[#f97316] hover:text-[#e06511] font-bold text-sm transition-all flex items-center gap-3"
              >
                Se connecter
              </Link>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}