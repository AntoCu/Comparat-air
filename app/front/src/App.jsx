import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from './pages/login-page';
import RegisterPage from './pages/register-page';
import MenuPage from './pages/menu-page';
import DashboardPage from './pages/dashboard-page';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  
  // On récupère le rôle directement depuis le localStorage
  const userRole = localStorage.getItem('role');

  return (
    <BrowserRouter>
      {/* BANDEAU DE STATUT GLOBAL */}
      {isLoggedIn && (
        <div style={{ 
          textAlign: 'right', 
          padding: '10px 20px', 
          fontSize: '14px' 
        }}>
          Connecté en tant que : <strong>{userEmail}</strong>  |  
          Statut : <span style={{ color: userRole === 'admin' ? 'green' : 'blue', fontWeight: 'bold' }}>
            {userRole === 'admin' ? ' Administrateur' : ' Utilisateur Standard'}
          </span>
        </div>
      )}

      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        
        <Route 
          path="/login" 
          element={<LoginPage setIsLoggedIn={setIsLoggedIn} setUserEmail={setUserEmail} />} 
        />

        <Route path="/register" element={<RegisterPage />} />
        
        <Route 
          path="/menu" 
          element={isLoggedIn ? <MenuPage userEmail={userEmail} setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/login" />} 
        />

        <Route 
          path="/dashboard" 
          element={isLoggedIn ? <DashboardPage /> : <Navigate to="/login" />} 
        />
      </Routes>
    </BrowserRouter>
  );
}