import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import HomePage from './pages/home-page';
import LoginPage from './pages/login-page';
import RegisterPage from './pages/register-page';
import MenuPage from './pages/menu-page';
import DashboardPage from './pages/dashboard-page';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  
  const userRole = localStorage.getItem('role');

  return (
    <BrowserRouter>
      {isLoggedIn && (
        <div style={{ 
          textAlign: 'right', 
          padding: '10px 20px', 
          backgroundColor: '#eee', 
          borderBottom: '1px solid #ccc' 
        }}>
          Utilisateur : <strong>{userEmail}</strong> | 
          Rôle : <span style={{ color: userRole === 'admin' ? 'green' : 'blue' }}>
            {userRole === 'admin' ? ' Administrateur' : ' Standard'}
          </span>
        </div>
      )}

      <Routes>
        <Route path="/" element={<HomePage />} />
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

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}