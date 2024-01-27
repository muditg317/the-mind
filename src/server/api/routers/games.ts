import { eq } from "drizzle-orm/sql/expressions/conditions";
import { z } from "zod";

import { TRPCError } from "@trpc/server"
import { createTRPCRouter, publicProcedure } from "@server/api/trpc";
import { games } from "@server/db/schema";
import { getGameMiddleware } from "../middleware/games";
import { userId } from "@lib/mind";

const UNKOWN_HOST_IP = "UNKOWN_HOST_IP";


export const gamesRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ roomName: z.string().min(3), hostName: z.string().min(3) }))
    .mutation(async ({ ctx, input: {roomName, hostName} }) => {
      const remote_addr = ctx.headers.get('x-forwarded-for') ?? UNKOWN_HOST_IP;
      const playerId = userId({ roomName, playerName: hostName });

      await ctx.db.insert(games).values({
        room_name: roomName,
        host_ip: remote_addr,
        host_name: hostName,
        player_list: {[playerId]: {
          roomName,
          playerName: hostName,
          checkedIn:false
        }},
      });
      console.log(`created ${roomName} room hosted by ${hostName}`);
    }),

  getOpenRooms: publicProcedure.query(({ ctx }) => {
    return ctx.db.query.games.findMany({
      orderBy: (games, { desc }) => [desc(games.updatedAt)],
      columns: {
        room_name: true
      }
    }).then(games => games.map(game => game.room_name));
  }),

  attemptJoin: publicProcedure
    .input(z.object({ roomName: z.string().min(3), playerName: z.string().min(3) }))
    .use(getGameMiddleware({
      id: true,
      room_name: true,
      player_list: true
    }))
    .mutation(async ({ ctx: { game, db }, input: { playerName } }) => {
      const playerId = userId({roomName: game.room_name, playerName});

      if (game.player_list[playerId]?.checkedIn) throw new TRPCError({
        code: "UNAUTHORIZED",
        message: `Player ${playerName} is already in the room!`
      })

      console.log(`Registering ${playerName} in ${game.room_name}`);
      const player = game.player_list[playerId] = game.player_list[playerId] ?? {
        roomName: game.room_name,
        playerName,
        checkedIn: false
      };
      player.checkedIn = false;

      await db.update(games)
        .set(game)
        .where(eq(games.room_name, game.room_name))
        .execute()
      console.log(`Updated db for ${playerName} => ${game.room_name}`);

      console.log(`${playerName} joined ${game.room_name} room`)
      return {
        roomName: game.room_name,
        playerName: playerName
      };
    }),

  // leaveGame: publicProcedure
  //   .input(z.object({ roomName: z.string().min(3), playerName: z.string().min(3) }))
  //   .use(getGameMiddleware({
  //     id: true,
  //     room_name: true,
  //     player_list: true
  //   }))
  //   .mutation(async ({ ctx: { game, db }, input: { roomName, playerName } }) => {
  //     const playerId = userId({roomName: game.room_name, playerName});

  //     if (!game) throw new TRPCError({
  //       code: "BAD_REQUEST",
  //       message: `There is no active room: ${roomName}`,
  //     });
  //     if (!(playerId in game.player_list) || !game.player_list[playerId]) throw new TRPCError({
  //       code: "UNAUTHORIZED",
  //       message: `Player ${playerName} is not in the room!`
  //     })

  //     delete game.player_list[playerId];

  //     // console.log(`${playerName} left room ${game.room_name}`)
  //     // const anyActive = Object.values(game.player_list).reduce((any, player) => any || player.checkedIn, false);
  //     const anyActive = Object.values(game.player_list).some(player => player.checkedIn);
  //     if (anyActive) {
  //       await db.update(games)
  //         .set(game)
  //         .where(eq(games.room_name, game.room_name))
  //         .execute()
  //     } else { // all players gone!
  //       console.log(`room ${game.room_name} closed`)
  //       await db.delete(games)
  //         .where(eq(games.room_name, game.room_name))
  //         .execute()
  //     }
      
  //     return true;
  //   }),

  players: publicProcedure
    .input(z.object({ roomName: z.string() }))
    .use(getGameMiddleware({
      player_list: true
    }))
    .query(async ({ ctx: { game: { player_list } } }) => {
      return player_list;
    }),

  clear: publicProcedure.mutation(async ({ ctx: { db: _db }}) => {
    // await db.delete(games).execute();
  }),
});
