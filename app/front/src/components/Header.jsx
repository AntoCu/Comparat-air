import { Link } from 'react-router-dom';

export default function Header({ isLoggedIn, handleLogout }) {

  return (
    <div className="w-full absolute top-6 z-50 flex justify-center px-4 md:px-8">
      <nav className="w-full max-w-7xl bg-white/95 backdrop-blur-md shadow-lg flex justify-between items-center px-6 md:px-10 py-3 md:py-4 rounded-3xl border border-slate-200">
        
        <Link to="/" className="hover:opacity-80 transition-opacity flex items-center gap-2">
          <img src="/logo.png" alt="Comparat'air Logo" className="h-8 md:h-12 object-contain" />
        </Link>

        <div className="flex items-center gap-4 md:gap-8">

          <Link 
            to={isLoggedIn ? "/likes" : "/login"} 
            className="flex items-center gap-2 text-[#262262] font-bold hover:opacity-70 transition-opacity"
          >
            <img src="/Like.png" alt="Favoris" className="h-6 md:h-8 object-contain" />
            <span className="hidden md:inline">Favoris</span>
          </Link>

          <Link 
            to={isLoggedIn ? "/profile" : "/login"} 
            className="flex items-center gap-2 text-[#262262] font-bold hover:opacity-70 transition-opacity"
          >
            <img src="/Profil.png" alt="Profil" className="h-6 md:h-8 object-contain" />
            <span className="hidden md:inline">Profil</span>
          </Link>

          <div className="h-8 w-px bg-slate-300 mx-2"></div>

          {isLoggedIn ? (
            <button 
              onClick={handleLogout} 
              className="text-red-500 hover:text-red-600 font-bold text-sm md:text-base hover:underline transition-all"
            >
              Déconnexion
            </button>
          ) : (
            <Link 
              to="/login"
              className="text-[#f97316] hover:text-[#e06511] font-bold text-sm md:text-base hover:underline transition-all"
            >
              Se connecter
            </Link>
          )}
        </div>

      </nav>
    </div>
  );
}