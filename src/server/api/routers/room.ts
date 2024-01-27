import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@server/api/trpc";
import { getGameMiddleware } from "../middleware/games";
import { type MindUserId, mindUserZod, userId } from "@lib/mind";
import { TRPCError } from "@trpc/server";

export const roomRouter = createTRPCRouter({
  // checkIn: publicProcedure
  //   .input(z.object({  }).merge(mindUserZod))
  //   .use(getGameMiddleware({
  //     id: true,
  //     host_name: true,
  //     room_name: true,
  //     player_list: true,
  //   }))
  //   .mutation(async ({ ctx: { db, game }, input: { playerName } }) => {
  //     console.log(`${playerName} checked in to room ${game.room_name}`);

  //     const playerId = userId({roomName: game.room_name, playerName});

  //     if (!(playerId in game.player_list)) throw new TRPCError({
  //       code: "UNAUTHORIZED",
  //       message: `Cannot check-in: Player ${playerName} is not part of the ${game.room_name} room!`
  //     })

  //     game.player_list[playerId]!.checkedIn = true;
  //     await db.update(games)
  //       .set(game)
  //       .where(eq(games.room_name, game.room_name))
  //       .execute();
        

  //     // const {users: userIds} = await getUsersInRoom(game.room_name);
  //     const playerNames = [];
  //     for (const otherPlayerId in game.player_list) {
  //       const otherPlayer = game.player_list[otherPlayerId as MindUserId]!;
  //       // if (otherPlayerId === otherPlayerName) {
  //       //   game.player_list[otherPlayerName] = true
  //       // }
  //       playerNames.push(otherPlayer.playerName);
  //     }
  //     return {
  //       playerNames,
  //       isHost: game.host_name === playerName
  //     };
  //   }),
  
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

      // const {users: userIds} = await getUsersInRoom(game.room_name);
      const playerNames = [];
      for (const otherPlayerId in game.player_list) {
        const otherPlayer = game.player_list[otherPlayerId as MindUserId]!;
        // if (otherPlayerId === otherPlayerName) {
        //   game.player_list[otherPlayerName] = true
        // }
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
});
