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

  pingForUpdate: publicProcedure
    .input(mindUserZod)
    .query(async ({ input: mindUser }) => {
      await sendGameUpdates(mindUser.roomName, userId(mindUser));
      return true;
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
