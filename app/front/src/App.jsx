import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
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
  // eslint-disable-next-line no-unused-vars
  const [userName, setUserName] = useState(localStorage.getItem('name') || '');
  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setUserEmail('');
    setUserName('');
  };

  return (
    <BrowserRouter>
      <Header isLoggedIn={isLoggedIn} handleLogout={handleLogout} />
      <div className>
        <Routes>
          <Route path="/login" element={<LoginPage setIsLoggedIn={setIsLoggedIn} setUserEmail={setUserEmail} setUserName={setUserName} />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={isLoggedIn ? <ProfilePage setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/login" />} />
            <Route path="/likes" element={isLoggedIn ? <LikesPage /> : <Navigate to="/login" />} />
            <Route path="/menu" element={isLoggedIn ? <MenuPage userEmail={userEmail} setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/login" />} />
            <Route
              path="/dashboard"
              element={
                isLoggedIn && localStorage.getItem('role') === 'admin'
                  ? <DashboardPage />
                  : <Navigate to="/" />
              }
            />          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}