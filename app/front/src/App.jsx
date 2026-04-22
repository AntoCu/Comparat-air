import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from './layouts/MainLayout';
import HomePage from './pages/home-page';
import LoginPage from './pages/login-page';
import RegisterPage from './pages/register-page';
import MenuPage from './pages/menu-page';
import DashboardPage from './pages/dashboard-page';
import ProfilePage from './pages/profile-page';
import LikesPage from './pages/likes-page';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [userEmail, setUserEmail] = useState(localStorage.getItem('email') || '');
  const [userName, setUserName] = useState(localStorage.getItem('name') || ''); 
  
  const userRole = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setUserEmail('');
    setUserName('');
  };

  return (
    <BrowserRouter>
      {isLoggedIn && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center', 
          gap: '15px',
          padding: '10px 20px', 
          backgroundColor: '#eee', 
          borderBottom: '1px solid #ccc' 
        }}>
          <span>
            Utilisateur : <strong>{userName}</strong> ({userEmail}) | 
            Rôle : <span style={{ color: userRole === 'admin' ? 'green' : 'blue' }}>
              {userRole === 'admin' ? ' Administrateur' : ' Standard'}
            </span>
          </span>
          
          {}
          <button 
            onClick={handleLogout} 
            style={{ 
              backgroundColor: '#dc3545', 
              color: 'white', 
              border: 'none', 
              padding: '5px 10px', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            Se déconnecter
          </button>
        </div>
      )}

      <Routes>
        <Route path="/login" element={<LoginPage setIsLoggedIn={setIsLoggedIn} setUserEmail={setUserEmail} setUserName={setUserName} />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/profile" element={isLoggedIn ? <ProfilePage setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/login" />} />
          <Route path="/likes" element={isLoggedIn ? <LikesPage /> : <Navigate to="/login" />} />
          <Route path="/menu" element={isLoggedIn ? <MenuPage userEmail={userEmail} setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/login" />} />
          <Route path="/dashboard" element={isLoggedIn ? <DashboardPage /> : <Navigate to="/login" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}