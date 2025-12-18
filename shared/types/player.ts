import { PlayerId } from './common';

export interface PlayerProfile {
  id: PlayerId;
  displayName: string;
  avatarUrl?: string;
}
