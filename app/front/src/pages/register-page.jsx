import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('${API_URL}/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });
      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Inscription réussie !');
        setEmail('');
        setPassword('');
        setTimeout(() => navigate('/login'), 1200);
      } else {
        setErrorMessage(data.detail || 'Erreur lors de l’inscription.');
      }
    } catch (error) {
      console.error(error);
      setErrorMessage('Impossible de joindre le backend.');
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
        className="relative z-10 w-[95%] max-w-[460px] min-h-[560px] flex flex-col justify-between py-10 sm:py-12 drop-shadow-2xl mx-auto mt-24 sm:mt-0"
        style={{
          backgroundImage: 'url("/ticket-bg.png")',
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <h2 className="text-3xl md:text-4xl font-black text-[#262262] mb-5 sm:mb-6 text-center">
          S'inscrire
        </h2>
          
        <div className="flex flex-col items-center justify-center w-full flex-1 pl-[20%] pr-[6%] sm:pl-[90px] sm:pr-[30px]">

          {errorMessage && <div className="text-red-500 font-bold text-sm mb-2 text-center">{errorMessage}</div>}
          {successMessage && <div className="text-green-600 font-bold text-sm mb-2 text-center">{successMessage}</div>}

          <form id="register-form" onSubmit={handleRegister} className="flex flex-col gap-4 w-full">
            <div className="flex flex-col items-center w-full">
              <label className="text-[#262262] font-black text-sm sm:text-base mb-1">Nom d'utilisateur</label>
              <input
                type="text"
                placeholder="Ton pseudo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#f4f7fc] border border-[#262262]/30 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-center text-xs sm:text-sm font-bold text-[#6b66c7] italic shadow-inner outline-none focus:border-[#f97316] transition-colors"
              />
            </div>

            <div className="flex flex-col items-center w-full">
              <label className="text-[#262262] font-black text-sm sm:text-base mb-1">Identifiant</label>
              <input
                type="email"
                placeholder="exemple@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#f4f7fc] border border-[#262262]/30 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-center text-xs sm:text-sm font-bold text-[#6b66c7] italic shadow-inner outline-none focus:border-[#f97316] transition-colors"
              />
            </div>

            <div className="flex flex-col items-center w-full">
              <label className="text-[#262262] font-black text-sm sm:text-base mb-1">Mot de passe</label>
              <input
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#f4f7fc] border border-[#262262]/30 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-center text-xs sm:text-sm font-bold text-[#6b66c7] italic shadow-inner outline-none focus:border-[#f97316] transition-colors"
              />
            </div>
          </form>
        </div>

        <div className="w-full pl-[20%] pr-[6%] sm:pl-[90px] sm:pr-[30px] my-4 sm:my-5">
          <div className="border-t-[2px] border-dashed border-[#a5a2d1]/60 w-full"></div>
        </div>

        <div className="flex justify-center gap-2 sm:gap-4 pl-[20%] pr-[6%] sm:pl-[90px] sm:pr-[30px] pb-2">
          <button 
            type="submit" 
            form="register-form"
            className="bg-[#f97316] hover:bg-[#e06511] text-white font-bold py-2.5 sm:py-3 px-2 rounded-xl transition-transform hover:scale-105 shadow-md flex-1 text-sm sm:text-base text-center"
          >
            S'inscrire
          </button>
          <Link 
            to="/login" 
            className="bg-[#f97316] hover:bg-[#e06511] text-white font-bold py-2.5 sm:py-3 px-2 rounded-xl transition-transform hover:scale-105 shadow-md flex-1 text-center text-sm sm:text-base flex items-center justify-center block"
          >
            Connexion
          </Link>
        </div>

      </div>
    </div>
  );
}