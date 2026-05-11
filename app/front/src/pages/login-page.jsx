import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function LoginPage({ setIsLoggedIn, setUserEmail, setUserName }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      const response = await fetch('http://127.0.0.1:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem("user_id", data.id); 
        localStorage.setItem('role', data.role);
        localStorage.setItem('name', data.name);
        setUserEmail(data.email);
        setUserName(data.name);
        setIsLoggedIn(true);
        navigate('/');
      } else {
        setErrorMessage(data.detail || "Erreur de connexion.");
      }
    } catch (error) {
      setErrorMessage("Impossible de joindre l'API");
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
        className="relative z-10 w-[460px] h-[520px] flex flex-col justify-between py-12 drop-shadow-2xl"
        style={{
          backgroundImage: 'url("/ticket-bg.png")', 
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <h2 className="text-3xl md:text-4xl font-black text-[#262262] mb-8 text-center">
          Connectez-vous
        </h2>
          
        <div className="flex flex-col items-center justify-center w-full flex-1 pl-[90px] pr-[30px]">

          {errorMessage && (
            <div className="text-red-500 font-bold text-sm mb-4 text-center">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5 w-full">
            <div className="flex flex-col items-center w-full">
              <label className="text-[#262262] font-black text-base mb-1.5">Identifiant</label>
              <input
                type="email"
                placeholder="exemple@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#f4f7fc] border border-[#262262]/30 rounded-xl px-4 py-3 text-center text-sm font-bold text-[#6b66c7] italic shadow-inner outline-none focus:border-[#f97316] transition-colors"
              />
            </div>

            <div className="flex flex-col items-center w-full">
              <label className="text-[#262262] font-black text-base mb-1.5">Mot de passe</label>
              <input
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#f4f7fc] border border-[#262262]/30 rounded-xl px-4 py-3 text-center text-sm font-bold text-[#6b66c7] italic shadow-inner outline-none focus:border-[#f97316] transition-colors"
              />
            </div>
          </form>
        </div>

        <div className="w-full pl-[90px] pr-[30px] my-6">
          <div className="border-t-[2px] border-dashed border-[#a5a2d1]/60 w-full"></div>
        </div>

        <div className="flex justify-center gap-4 pl-[90px] pr-[30px] pb-2">
          <button 
            type="submit" 
            onClick={handleLogin}
            className="bg-[#f97316] hover:bg-[#e06511] text-white font-bold py-3 px-2 rounded-xl transition-transform hover:scale-105 shadow-md flex-1 text-base"
          >
            Connexion
          </button>
          <Link 
            to="/register" 
            className="bg-[#f97316] hover:bg-[#e06511] text-white font-bold py-3 px-2 rounded-xl transition-transform hover:scale-105 shadow-md flex-1 text-center text-base flex items-center justify-center"
          >
            S'inscrire
          </Link>
        </div>

      </div>
    </div>
  );
}