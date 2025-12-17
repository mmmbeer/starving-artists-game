import PlaceholderPanel from '../components/PlaceholderPanel';

interface GameViewProps {
  onReturn: () => void;
}

const GameView = ({ onReturn }: GameViewProps) => (
  <PlaceholderPanel
    title="Game Room"
    description="This view will show the studio, canvases, and action controls."
    actionLabel="Return to lobby"
    action={onReturn}
  />
);

export default GameView;
