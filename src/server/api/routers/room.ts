import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@server/api/trpc";
import { getGameMiddleware } from "../middleware/games";
import { type MindUserId, mindUserZod, userId, type MindPublicGameState, gameChannelName } from "@lib/mind";
import { TRPCError } from "@trpc/server";
import { UNKNOWN_HOST_IP } from "@lib/utils";
import { games } from "@server/db/schema";
import { eq } from "drizzle-orm";
import { pusherServer } from "@pusher/server";
import { sendGameUpdates } from "@server/helpers";

export const roomRouter = createTRPCRouter({
  playerInfo: publicProcedure
    .input(z.object({  }).merge(mindUserZod))
    .use(getGameMiddleware({
      id: true,
      host_name: true,
      room_name: true,
      player_list: true,
    }))
    .query(async ({ ctx: { game }, input: { playerName } }) => {
      const playerId = userId({roomName: game.room_name, playerName});
      if (!(playerId in game.player_list)) throw new TRPCError({
        code: "UNAUTHORIZED",
        message: `Cannot get player info: Player ${playerName} is not part of the ${game.room_name} room!`
      })

      const playerNames = [];
      for (const otherPlayerId in game.player_list) {
        const otherPlayer = game.player_list[otherPlayerId as MindUserId]!;
        playerNames.push(otherPlayer.playerName);
      }
      return {
        playerNames,
        hostName: game.host_name,
      };
    }),

  // registerSocketId: publicProcedure
  //   .input(z.object({ socketId: z.string() }).merge(mindUserZod).or(z.object({ removeId: z.string() }).merge(mindUserZod)))
  //   .use(getGameMiddleware({
  //     id: true,
  //     room_name: true,
  //     player_list: true,
  //     updatedAt: true
  //   }))
  //   .mutation(async ({ ctx: { db, game }, input: { playerName, ...otherInput } }) => {
  //     const playerId = userId({roomName: game.room_name, playerName});
  //     if (!(playerId in game.player_list)) throw new TRPCError({
  //       code: "UNAUTHORIZED",
  //       message: `Cannot get player info: Player ${playerName} is not part of the ${game.room_name} room!`
  //     });

  //     const player = game.player_list[playerId]!;

  //     if ("socketId" in otherInput) {
  //       const {socketId} = otherInput;
  //       // if (!!player.socketId) throw new TRPCError({
  //       //   code: "UNAUTHORIZED",
  //       //   message: `Player ${playerName} already has registered socketId!`,
  //       // });
        

  //       player.socketId = socketId;
  //     } else {
  //       const {removeId} = otherInput;
  //       if (player.socketId === removeId) delete player.socketId;
  //       else console.warn(`Player ${playerName} is not registered with socketId=(${removeId}). Ignoring removal`);
  //     }

  //     await db.update(games)
  //           .set(game)
  //           .where(eq(games.room_name, game.room_name))
  //           .execute();

  //     console.log(`${player.playerName} updated socketId=(${player.socketId}) in room ${game.room_name}`);
  //   }),

  // gameState: publicProcedure
  //   .input(z.object({  }).merge(mindUserZod))
  //   .use(getGameMiddleware({
  //     id: true,
  //     room_name: true,
  //     player_list: true,
  //     started: true,
  //     level: true,
  //     played_cards: true
  //   }))
  //   .query<MindPublicGameState>(async ({ ctx: { game }, input: { playerName } }) => {
  //     const playerId = userId({roomName: game.room_name, playerName});
  //     if (!(playerId in game.player_list)) throw new TRPCError({
  //       code: "UNAUTHORIZED",
  //       message: `Cannot get player info: Player ${playerName} is not part of the ${game.room_name} room!`
  //     });

  //     const playerState: Record<MindUserId, {
  //       ready: boolean,
  //       cardsLeft: number,
  //       cards?: number[],
  //     }> = {};
  //     for (const otherPlayerId in game.player_list) {
  //       const otherPlayer = game.player_list[otherPlayerId as MindUserId]!;
  //       playerState[otherPlayerId as MindUserId] = {
  //         ready: otherPlayer.checkedIn && otherPlayer.ready,
  //         cardsLeft: otherPlayer.cards.length,
  //       };
  //       if (otherPlayerId === playerId) { // requesting player
  //         playerState[otherPlayerId]!.cards = otherPlayer.cards;
  //       }
  //     }

  //     // console.log("the state", {
  //     //   started: game.started!,
  //     //   level: game.level!,
  //     //   played_cards: game.played_cards!,
  //     //   playerState
  //     // });

  //     return {
  //       started: game.started!,
  //       level: game.level!,
  //       played_cards: game.played_cards!,
  //       playerState
  //     }
  //   }),
  
  isLocked: publicProcedure
    .input(z.object({ roomName: z.string() }))
    .use(getGameMiddleware({
      locked: true,
    }))
    .query(({ ctx: { game }}) => {
      return game.locked;
    }),
  
  toggleRoomLock: publicProcedure
    .input(z.object({ roomName: z.string(), playerName: z.string() }))
    .use(getGameMiddleware({
      id: true,
      host_ip: true,
      host_name: true,
      room_name: true,
      locked: true,
    }))
    .mutation(async ({ ctx: { db, headers, game }, input: { playerName }}) => {
      const remoteAddr = headers.get('x-forwarded-for') ?? UNKNOWN_HOST_IP;
      
      const isHost = game.host_name === playerName && (
        remoteAddr === game.host_ip
        || remoteAddr === UNKNOWN_HOST_IP
        || game.host_ip === UNKNOWN_HOST_IP
      );
      // console.log("name equal", game.host_name === playerName);
      // console.log("ip equal", remoteAddr === game.host_name);
      if (!isHost) throw new TRPCError({
        code: "UNAUTHORIZED",
        message: `Only the host(${game.host_name}) can control the room! You are (${playerName}). --- IP info: host=(${game.host_ip})  request=(${remoteAddr})`,
      });

      game.locked = !game.locked;


      await db.update(games)
        .set(game)
        .where(eq(games.room_name, game.room_name))
        .execute();
      console.log(`Room ${game.room_name} ${game.locked ? "" : "un"}locked by ${playerName}`);

      return game.locked;
    }),

  toggleReady: publicProcedure
    .input(mindUserZod)
    .use(getGameMiddleware({
      id: true,
      room_name: true,
      player_list: true,
    }))
    .mutation(async ({ ctx: { db, headers, game }, input: { playerName }}) => {
      const playerId = userId({roomName: game.room_name, playerName});
      if (!(playerId in game.player_list)) throw new TRPCError({
        code: "UNAUTHORIZED",
        message: `Cannot get player info: Player ${playerName} is not part of the ${game.room_name} room!`
      });

      const player = game.player_list[playerId]!;

      player.ready = !player.ready;

      await db.update(games)
        .set(game)
        .where(eq(games.room_name, game.room_name))
        .execute();

      console.log(`Player ${playerName} updated ready=${player.ready} in room ${game.room_name}`);

      await sendGameUpdates(game.room_name, playerId);

      return player.ready;
    }),

  startGame: publicProcedure
    .input(mindUserZod)
    .use(getGameMiddleware({
      id: true,
      host_ip: true,
      host_name: true,
      room_name: true,
      locked: true,
    }))
    .mutation(async ({ ctx: { db, headers, game }, input: { playerName }}) => {
      const remoteAddr = headers.get('x-forwarded-for') ?? UNKNOWN_HOST_IP;
      
      const isHost = game.host_name === playerName && (
        remoteAddr === game.host_ip
        || remoteAddr === UNKNOWN_HOST_IP
        || game.host_ip === UNKNOWN_HOST_IP
      );
      // console.log("name equal", game.host_name === playerName);
      // console.log("ip equal", remoteAddr === game.host_name);
      if (!isHost) throw new TRPCError({
        code: "UNAUTHORIZED",
        message: `Only the host(${game.host_name}) can control the room! You are (${playerName}). --- IP info: host=(${game.host_ip})  request=(${remoteAddr})`,
      });

      game.locked = !game.locked;


      await db.update(games)
        .set(game)
        .where(eq(games.room_name, game.room_name))
        .execute();
      console.log(`Room ${game.room_name} ${game.locked ? "" : "un"}locked by ${playerName}`);

      return game.locked;
    }),
});
