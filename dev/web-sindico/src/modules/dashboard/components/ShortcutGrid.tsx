import { Link } from 'react-router-dom';

interface Shortcut {
  title: string;
  description: string;
  to: string;
}

interface ShortcutGridProps {
  shortcuts: Shortcut[];
}

export function ShortcutGrid({ shortcuts }: ShortcutGridProps) {
  return (
    <section className="shortcut-grid">
      {shortcuts.map((shortcut) => (
        <Link key={shortcut.to} to={shortcut.to} className="shortcut-card">
          <strong>{shortcut.title}</strong>
          <p>{shortcut.description}</p>
          <span>Abrir módulo</span>
        </Link>
      ))}
    </section>
  );
}
