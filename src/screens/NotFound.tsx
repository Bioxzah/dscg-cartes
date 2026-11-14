import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <main className="screen">
      <h1 className="screen-title">Introuvable</h1>
      <p className="muted">Cette page n’existe pas, ou la carte a été retirée de son fichier.</p>
      <Link className="back" to="/">‹ Retour à l’accueil</Link>
    </main>
  );
}
