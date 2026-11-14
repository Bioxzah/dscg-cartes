interface Props {
  paused: boolean;
  onToggle: () => void;
  label: string;
}

/** Switch: on = active, off = paused. A paused theme gives no new cards; its reviews continue. */
export function PauseToggle({ paused, onToggle, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!paused}
      aria-label={`Nouvelles cartes : ${label}`}
      title={paused ? 'En pause' : 'Actif'}
      className="switch"
      onClick={onToggle}
    >
      <span className="switch-track" aria-hidden="true">
        <span className="switch-thumb" />
      </span>
    </button>
  );
}
