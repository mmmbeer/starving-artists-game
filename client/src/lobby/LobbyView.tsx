import PlaceholderPanel from '../components/PlaceholderPanel';

interface LobbyViewProps {
  onEnterGame: () => void;
}

const LobbyView = ({ onEnterGame }: LobbyViewProps) => (
  <PlaceholderPanel
    title="Lobby"
    description="Players gather here, chat, and organize before the first turn."
    actionLabel="Enter placeholder game"
    action={onEnterGame}
  />
);

export default LobbyView;
