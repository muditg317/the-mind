import { z } from "zod";
import type { ValueOf } from "./utils";
import { env } from "@env";

export const ROOM_VACATED_DELAY_MS_TO_DELETE_ROOM = 5000 as const;
export const GAME_COMPLETED_DELAY_MS_SEND_UPDATE = 500 as const;
export const STATE_UPDATE_PUSHER_EVENT = "update_game_state" as const;

export const mindRoomNameZod = z.string().regex(/^[\w]+$/).min(3);
export const mindPlayerNameZod = z.string().regex(/^[\w]+$/).min(3);

export const mindUserZod = z.object({
  roomName: mindRoomNameZod,
  playerName: mindPlayerNameZod,
});

const delim = ",.-.," as const;
type delim = typeof delim;
export type MindUserId = `${delim}mind-player${delim}room-${string}${delim}name-${string}${delim}`;
export type MindUser = z.infer<typeof mindUserZod>;
export type MindUserPresence = MindUser & {
  user_id: MindUserId;
}

export type MindPublicGameState = {
  started: boolean;
  level: number;
  played_cards: number[];
  playerState: Record<MindUser["playerName"], {
      ready: boolean;
      cardsLeft: number;
      visibleCards?: number[];
  }>;
}

export type MindUserPrivateState = {
  socketId?: string;
  checkedIn: boolean;
  ready: boolean;
  cards: number[];
}
export function defaultPlayerPrivateState(): MindUserPrivateState {
  return {
    checkedIn: false,
    ready: false,
    cards: []
  };
}


export type MindLocalGameState = MindUser & {
  playerInfo: MindUserPrivateState,
  gameState: MindPublicGameState,
};
export type MindGameStateUpdate = 
  | {
    type: "playerInfo",
    playerInfo: MindUserPrivateState,
  }
  | {
    type: "stateUpdate",
    newState: MindPublicGameState,
  }
  | {
    type: "playerUpdate",
    playerName: MindUser["playerName"],
    newInfo: ValueOf<MindPublicGameState["playerState"]>,
  }
;

function roomChannelPrefix(roomName: string) {
  return `world-${env.NEXT_PUBLIC_PUSHER_WORLD}-room-${roomName}`;
}
export function gameChannelName(roomName: string) {
  return `${roomChannelPrefix(roomName)}-game`;
}
export function generalChatChannelName(roomName: string) {
  return `${roomChannelPrefix(roomName)}-chat-all`;
}
export function finishedChatChannelName(roomName: string) {
  return `${roomChannelPrefix(roomName)}-chat-finished`;
}
export function getRoomNameFromGameChannel(game_channel_name: string) {
  return /^room-(.*)-game$/.exec(game_channel_name)?.at(1);
}

export function userId({ roomName, playerName }: MindUser): MindUserId {
  return `${delim}mind-player${delim}room-${roomName}${delim}name-${playerName}${delim}`;
}

export function arrayContainsMatchingPlayer(array: MindUserPresence[], searchPlayer: MindUserPresence) {
  return !!array.find(playerFromArray => playerFromArray.user_id === searchPlayer.user_id);
}