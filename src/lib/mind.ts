import {z} from "zod";

export const mindUserZod = z.object({
  roomName: z.string().min(1),
  playerName: z.string().min(1),
});

export type MindUser = z.infer<typeof mindUserZod>;
export type MindUserPresence = MindUser & {
  user_id: MindUserId;
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

const delim = ",.-.," as const;
type delim = typeof delim;
export type MindUserId = `${delim}mind-player${delim}room-${string}${delim}name-${string}${delim}`
export function userId({ roomName, playerName }: MindUser): MindUserId {
  return `${delim}mind-player${delim}room-${roomName}${delim}name-${playerName}${delim}`;
}