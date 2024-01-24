import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { games } from "~/server/db/schema";

const UNKOWN_HOST_IP = "UNKOWN_HOST_IP";

export const gamesRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ name: z.string().min(3), password: z.string().min(3) }))
    .mutation(async ({ ctx, input }) => {
      const remote_addr = ctx.headers.get('x-forwarded-for') || UNKOWN_HOST_IP;

      await ctx.db.insert(games).values({
        name: input.name,
        host_ip: remote_addr,
        password: input.password
      });
    }),

  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.db.query.games.findMany({
      orderBy: (games, { desc }) => [desc(games.updatedAt)],
      columns: {
        name: true
      }
    });
  }),

  attemptJoin: publicProcedure
    .input(z.object({ name: z.string().min(3), password: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const remote_addr = ctx.headers.get('x-forwarded-for') || UNKOWN_HOST_IP;

      const game = await ctx.db.query.games.findFirst({
        where: ({ name }, { eq }) => eq(name, input.name),
        columns: {
          name: true,
          host_ip: true,
          password: true
        }
      }).execute();

      if (!game) {
        return false;
      }

      if (remote_addr != UNKOWN_HOST_IP && game.host_ip === remote_addr) {
        return true;
      }

      return game.password === input.password;
    }),
});
