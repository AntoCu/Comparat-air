import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div>
      <h1>Bienvenue sur SkyStream</h1>
      <hr />
      <ul>
        <li><Link to="/login">Se connecter</Link></li>
        <li><Link to="/register">Créer un compte</Link></li>
      </ul>
    </div>
  );
}