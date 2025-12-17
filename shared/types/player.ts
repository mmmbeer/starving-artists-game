import { PlayerId } from './game';

export interface PlayerProfile {
  id: PlayerId;
  displayName: string;
  avatarUrl?: string;
}
