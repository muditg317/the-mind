import { eq } from "drizzle-orm/sql/expressions/conditions";
import { z } from "zod";

import { TRPCError } from "@trpc/server"
import { createTRPCRouter, publicProcedure } from "@server/api/trpc";
import { games } from "@server/db/schema";
import { pusherServerClient } from "@server/pusher";

const UNKOWN_HOST_IP = "UNKOWN_HOST_IP";

export const gamesRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ roomName: z.string().min(3), hostName: z.string().min(3) }))
    .mutation(async ({ ctx, input }) => {
      const remote_addr = ctx.headers.get('x-forwarded-for') ?? UNKOWN_HOST_IP;

      await ctx.db.insert(games).values({
        room_name: input.roomName,
        host_ip: remote_addr,
        host_name: input.hostName,
        player_list: {[input.hostName]: ""}
      });
      console.log(`created ${input.roomName} room`)
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
    .mutation(async ({ ctx, input }) => {
      // const remote_addr = ctx.headers.get('x-forwarded-for') ?? UNKOWN_HOST_IP;

      const game = await ctx.db.query.games.findFirst({
        where: ({ room_name }, { eq, and }) => and(
          eq(room_name, input.roomName),
          // eq(host_ip, remote_addr)
        ),
        columns: {
          id: true,
          room_name: true,
          player_list: true
        }
      }).execute();

      if (!game) throw new TRPCError({
        code: "BAD_REQUEST",
        message: `There is no active room: ${input.roomName}`,
      });
      if (!!game.player_list[input.playerName]) throw new TRPCError({
        code: "UNAUTHORIZED",
        message: `Player ${input.playerName} is already in the room!`
      })

      console.log(`Registering ${input.playerName} in ${game.room_name}`);
      game.player_list[input.playerName] = "";

      await ctx.db.update(games)
        .set(game)
        .where(eq(games.room_name, game.room_name))
        .execute()
      console.log(`Updated db for ${input.playerName} => ${game.room_name}`);

      for (let player in game.player_list) {
        if (player === input.playerName) continue;
        console.log(`send update{${input.playerName} => ${game.room_name}} to ${player}`);
        try {
          await pusherServerClient.trigger(
            `room-${game.room_name}`,
            'new-player',
            {name: input.playerName}
          );
        } catch (e) {
          console.log(`Failed to send update to ${player}`)
          console.error(e);
          // throw new TRPCError({

          // })
        }
      }

      console.log(`${input.playerName} joined ${game.room_name} room`)
      return {
        roomName: game.room_name,
        playerName: input.playerName
      };
    }),

  leaveGame: publicProcedure
    .input(z.object({ roomName: z.string().min(3), playerName: z.string().min(3) }))
    .mutation(async ({ ctx, input }) => {
      // const remote_addr = ctx.headers.get('x-forwarded-for') ?? UNKOWN_HOST_IP;

      const game = await ctx.db.query.games.findFirst({
        where: ({ room_name }, { eq, and }) => and(
          eq(room_name, input.roomName),
          // eq(host_ip, remote_addr)
        ),
        columns: {
          id: true,
          room_name: true,
          player_list: true
        }
      }).execute();

      if (!game) throw new TRPCError({
        code: "BAD_REQUEST",
        message: `There is no active room: ${input.roomName}`,
      });
      if (!game.player_list[input.playerName]) throw new TRPCError({
        code: "UNAUTHORIZED",
        message: `Player ${input.playerName} is not in the room!`
      })

      game.player_list[input.playerName] = "";

      console.log(`${input.playerName} left ${game.room_name} room`)
      if (game.player_list.length) {
        await ctx.db.update(games)
          .set(game)
          .where(eq(games.room_name, game.room_name))
          .execute()
      } else { // all players gone!
      console.log(`room ${game.room_name} closed`)
      await ctx.db.delete(games)
          .where(eq(games.room_name, game.room_name))
          .execute()
      }
      
      return true;
    }),
  
  players: publicProcedure
    .input(z.object({ roomName: z.string() }))
    .query(async ({ ctx, input }) => {
      const game = await ctx.db.query.games.findFirst({
        where: ({ room_name }, { eq, and }) => and(
          eq(room_name, input.roomName),
          // eq(host_ip, remote_addr)
        ),
        columns: {
          id: true,
          room_name: true,
          player_list: true
        }
      }).execute();

      if (!game) throw new TRPCError({
        code: "BAD_REQUEST",
        message: `There is no active room: ${input.roomName}`,
      });

      return Object.keys(game.player_list);
    })
});
