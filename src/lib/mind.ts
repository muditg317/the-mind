import {z} from "zod";

export const ROOM_VACATED_DELAY_MS_TO_DELETE_ROOM = 5000 as const;

export const mindUserZod = z.object({
  roomName: z.string().min(1),
  playerName: z.string().min(1),
});

export type MindUser = z.infer<typeof mindUserZod>;
export type MindUserPresence = MindUser & {
  user_id: MindUserId;
}

export type MindPublicGameState = {
  started: boolean;
  level: number;
  played_cards: number[];
  playerState: Record<`,.-.,mind-player,.-.,room-${string},.-.,name-${string},.-.,`, {
      ready: boolean;
      cardsLeft: number;
      cards?: number[]; // only filled in for current player
  }>;
}

export type MindUserGameState = {
  checkedIn: boolean;
  ready: boolean;
  cards: number[]
}
export function defaultPlayerState(): MindUserGameState {
  return {
    checkedIn: false,
    ready: false,
    cards: []
  };
}


export function gameChannelName(roomName: string) {
  return `room-${roomName}-game`;
}
export function generalChatChannelName(roomName: string) {
  return `room-${roomName}-chat-all`;
}
export function finishedChatChannelName(roomName: string) {
  return `room-${roomName}-chat-finished`;
}
export function getRoomNameFromGameChannel(game_channel_name: string) {
  return /^room-(.*)-game$/.exec(game_channel_name)?.at(1);
}

const delim = ",.-.," as const;
type delim = typeof delim;
export type MindUserId = `${delim}mind-player${delim}room-${string}${delim}name-${string}${delim}`
export function userId({ roomName, playerName }: MindUser): MindUserId {
  return `${delim}mind-player${delim}room-${roomName}${delim}name-${playerName}${delim}`;
}

export function arrayContainsMatchingPlayer(array: MindUserPresence[], searchPlayer: MindUserPresence) {
  return !!array.find(playerFromArray => playerFromArray.user_id === searchPlayer.user_id);
}