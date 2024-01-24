import { eq, notLike } from "drizzle-orm/sql/expressions/conditions";
import { object, z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { games } from "~/server/db/schema";

const UNKOWN_HOST_IP = "UNKOWN_HOST_IP";

export const gamesRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ roomName: z.string().min(3), hostName: z.string().min(3) }))
    .mutation(async ({ ctx, input }) => {
      const remote_addr = ctx.headers.get('x-forwarded-for') || UNKOWN_HOST_IP;

      await ctx.db.insert(games).values({
        room_name: input.roomName,
        host_ip: remote_addr,
        host_name: input.hostName,
        player_list: [input.hostName]
      });
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
      // const remote_addr = ctx.headers.get('x-forwarded-for') || UNKOWN_HOST_IP;

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

      if (!game) throw new Error("No game with this name!");

      if (game.player_list.includes(input.playerName)) throw new Error(`Player ${input.playerName} already in room!`);

      game.player_list.push(input.playerName);

      await ctx.db.update(games)
        .set(game)
        .where(eq(games.room_name, game.room_name))
        .execute()
      
      return game.room_name;
    }),
});
