import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 30px', backgroundColor: '#f8f9fa', borderBottom: '2px solid #ccc' }}>
      <Link to="/" style={{ fontSize: '20px', fontWeight: 'bold', textDecoration: 'none', color: '#0056b3' }}>
        ✈️ SkyStream
      </Link>
      <nav style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link to="/likes" style={{ textDecoration: 'none', color: '#333', fontWeight: 'bold' }}>❤️ Likes</Link>
        <Link to="/profile" style={{ textDecoration: 'none', color: '#333', fontWeight: 'bold' }}>👤 Profil</Link>
      </nav>
    </header>
  );
}