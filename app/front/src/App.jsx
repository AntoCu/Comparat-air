import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from './pages/login-page';
import MenuPage from './pages/menu-page';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        
        <Route 
          path="/login" 
          element={<LoginPage setIsLoggedIn={setIsLoggedIn} setUserEmail={setUserEmail} />} 
        />
        
        <Route 
          path="/menu" 
          element={
            isLoggedIn ? <MenuPage userEmail={userEmail} setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/login" />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}