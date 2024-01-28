"use server"

import { eq } from "drizzle-orm";

import { getUsersInRoom, sendEvent, sendUserEvent } from "@pusher/server";
import { MindGameStateUpdate, MindPublicGameState, MindUser, MindUserId, MindUserPrivateState, STATE_UPDATE_PUSHER_EVENT, gameChannelName, userId } from "@lib/mind";

import { db } from "./db";
import { games } from "./db/schema";

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
  const {users: activeUsers} = await getUsersInRoom(roomName);
  let anyUpdates = false;
  for (const otherPlayerId in game.player_list) {
    const otherPlayer = game.player_list[otherPlayerId as MindUserId]!;
    const userActive = !!activeUsers.find(active => active.id === otherPlayerId);
    if (!userActive) {
      otherPlayer.checkedIn = false;
      otherPlayer.ready = false;
      anyUpdates = true;
    } else if (!otherPlayer.checkedIn) {
      otherPlayer.checkedIn = true;
      anyUpdates = true;
    }
  }
  if (anyUpdates) {
    await db.update(games)
      .set(game)
      .where(eq(games.room_name, game.room_name))
      .execute();
  }

  const player = game.player_list[playerId];
  if (!player) throw new Error(
    `Player ${playerId} is not in room ${roomName}`
  );

  const playerState: Record<MindUserId, {
    ready: boolean,
    cardsLeft: number,
    cards?: number[],
  }> = {};
  for (const otherPlayerId in game.player_list) {
    const otherPlayer = game.player_list[otherPlayerId as MindUserId]!;
    playerState[otherPlayerId as MindUserId] = {
      ready: otherPlayer.checkedIn && otherPlayer.ready,
      cardsLeft: otherPlayer.cards.length,
    };
  }

  const gameState = {
    started: game.started!,
    level: game.level!,
    played_cards: game.played_cards!,
    playerState
  }
  const playerPrivateState = {
    checkedIn: player.checkedIn,
    ready: player.ready,
    cards: player.cards,
  }

  return [gameState, playerPrivateState];
}


export async function sendGameUpdates(roomName: string, playerId: MindUserId) {
  const [newState, playerInfo] = await getGameStateUpdate(roomName, playerId);

  sendEvent<MindGameStateUpdate>(
    gameChannelName(roomName),
    STATE_UPDATE_PUSHER_EVENT,
    {
      type: "stateUpdate",
      newState,
    }
  );
  // console.log("send user event to ", playerId, playerInfo);
  sendUserEvent<MindGameStateUpdate>(
    playerId,
    STATE_UPDATE_PUSHER_EVENT,
    {
      type: "playerInfo",
      playerInfo,
    }
  );
}