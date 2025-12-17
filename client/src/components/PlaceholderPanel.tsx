import type { ReactNode } from 'react';
import './PlaceholderPanel.css';

interface PlaceholderPanelProps {
  title: string;
  description: string;
  actionLabel: string;
  action: () => void;
  children?: ReactNode;
}

const PlaceholderPanel = ({ title, description, actionLabel, action, children }: PlaceholderPanelProps) => (
  <section className="placeholder-panel">
    <header>
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
    <div className="placeholder-body">{children}</div>
    <button type="button" onClick={action}>
      {actionLabel}
    </button>
  </section>
);

export default PlaceholderPanel;
