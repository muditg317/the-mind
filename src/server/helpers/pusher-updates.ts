"use server"

import { eq } from "drizzle-orm";

import { getUsersInRoom, sendEvent, sendUserEvent } from "@pusher/server";
import { ROOM_VACATED_DELAY_MS_TO_DELETE_ROOM, STATE_UPDATE_PUSHER_EVENT, gameChannelName } from "@lib/mind";
import type { MindGameStateUpdate, MindPublicGameState, MindUserId, MindUserPrivateState } from "@lib/mind";

import { db } from "../db";
import { games } from "../db/schema";
import { getGameStateFromDatabaseGame, getPlayerInfoFromDatabasePlayer, type GameSchema } from "./game-transform";



export async function getGameStateUpdate(roomName: string, playerId: MindUserId): Promise<[MindPublicGameState, MindUserPrivateState]> {
  const game = await db.query.games.findFirst({
    where: ({ room_name }, { eq, and }) => and(
      eq(room_name, roomName),
      // eq(host_ip, remote_addr)
    ),
    columns: {
      id: true,
      room_name: true,
      player_list: true,
      started: true,
      level: true,
      played_cards: true
    }
  }).execute();
  if (!game) throw new Error(
    `There is no active room: ${roomName}`
  );

  // TODO: this should happen elsewhere but whatever
  const activeUserIds = await getUsersInRoom(roomName);
  let anyUpdates = false;
  let anyActive = false;
  for (const otherPlayerId in game.player_list) {
    const otherPlayer = game.player_list[otherPlayerId as MindUserId]!;
    const userActive = activeUserIds.includes(otherPlayerId);
    if (!userActive) {
      otherPlayer.checkedIn = false;
      otherPlayer.ready = false;
      anyUpdates = true;
    } else {
      anyActive = true;
      if (!otherPlayer.checkedIn) {
        otherPlayer.checkedIn = true;
        anyUpdates = true;
      }
    }
  }
  if (anyUpdates) {
    await db.update(games)
      .set(game)
      .where(eq(games.room_name, game.room_name))
      .execute();
  }
  if (!anyActive) {
    void handleRoomEmpty(roomName);
  }

  const player = game.player_list[playerId];
  if (!player) throw new Error(
    `Player ${playerId} is not in room ${roomName}`
  );

  const gameState = await getGameStateFromDatabaseGame(game);
  const playerPrivateState = await getPlayerInfoFromDatabasePlayer(player);

  return [gameState, playerPrivateState];
}


export async function sendGameUpdates(roomName: string, playerId: MindUserId) {
  const [newState, playerInfo] = await getGameStateUpdate(roomName, playerId);

  await sendEvent<MindGameStateUpdate>(
    gameChannelName(roomName),
    STATE_UPDATE_PUSHER_EVENT,
    {
      type: "stateUpdate",
      newState,
    }
  );
  // console.log("send user event to ", playerId, playerInfo);
  await sendUserEvent<MindGameStateUpdate>(
    playerId,
    STATE_UPDATE_PUSHER_EVENT,
    {
      type: "playerInfo",
      playerInfo,
    }
  );
}
export async function sendGameUpdatesToAll(game: Omit<GameSchema, "createdAt"|"updatedAt"> | string) {
  if (typeof game === "string") {
    const loadedGame = await db.query.games.findFirst({
      where: ({ room_name }, { eq }) => eq(room_name, game as string),
      columns: {
        id: true,
        host_ip: true,
        host_name: true,
        room_name: true,
        player_list: true,
        locked: true,
        started: true,
        level: true,
        played_cards: true,
      }
    }).execute();
    if (!loadedGame) throw new Error(
      `There is no active room: ${loadedGame}`
    );
    game = loadedGame;
  }
  await sendEvent<MindGameStateUpdate>(
    gameChannelName(game.room_name),
    STATE_UPDATE_PUSHER_EVENT,
    {
      type: "stateUpdate",
      newState: await getGameStateFromDatabaseGame(game),
    }
  );

  for (const playerId in game.player_list) {
    await sendUserEvent<MindGameStateUpdate>(
      playerId,
      STATE_UPDATE_PUSHER_EVENT,
      {
        type: "playerInfo",
        playerInfo: await getPlayerInfoFromDatabasePlayer(game.player_list[playerId as MindUserId]!),
      }
    );
  }
}

export async function handleRoomEmpty(roomName: string) {
  const timeStr = `${(ROOM_VACATED_DELAY_MS_TO_DELETE_ROOM/1000).toFixed(2)}s`;
  console.log(
    `Room ${roomName} has been vacated! Waiting ${timeStr} before deleting game.`
  );
  await new Promise(resolve => setTimeout(resolve, ROOM_VACATED_DELAY_MS_TO_DELETE_ROOM));
  const activeUserIds = await getUsersInRoom(roomName);
  if (!!activeUserIds.length) {
    console.log(`Found new users [${activeUserIds.join('|||')}] in ${roomName} room! Cancelling deleting.`);
  } else {
    console.log(`No new users after ${timeStr}... Deleting ${roomName} room.`)
    await db.delete(games)
      .where(eq(games.room_name, roomName))
      .execute();
    console.log(`Room ${roomName} deleted.`)
  }
}