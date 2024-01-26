import { eq } from "drizzle-orm/sql/expressions/conditions";
import { z } from "zod";

import { TRPCError, experimental_standaloneMiddleware } from "@trpc/server"
import { createTRPCRouter, publicProcedure } from "@server/api/trpc";
import { games } from "@server/db/schema";
import { pusherServerClient } from "@server/pusher";
import { type TheMindDatabase } from "@server/db"
import { pusherServer } from "@lib/pusher/server";

const UNKOWN_HOST_IP = "UNKOWN_HOST_IP";

type GamesColumnQuery = Partial<Record<keyof NonNullable<TheMindDatabase["_"]["schema"]>["games"]["columns"], boolean>>

function getGameMiddleware<Cols extends GamesColumnQuery>(columns: Cols) {
  return experimental_standaloneMiddleware<{
    ctx: { db: TheMindDatabase }
    input: { roomName: string }
  }>().create(async ({ ctx: { db }, input: { roomName }, next }) => {
    // const remote_addr = ctx.headers.get('x-forwarded-for') ?? UNKOWN_HOST_IP;

    const game = await db.query.games.findFirst({
      where: ({ room_name }, { eq, and }) => and(
        eq(room_name, roomName),
        // eq(host_ip, remote_addr)
      ),
      columns: columns
    }).execute();

    if (!game) throw new TRPCError({
      code: "BAD_REQUEST",
      message: `There is no active room: ${roomName}`,
    });

    return next({
      ctx: {
        game
      }
    });
  })
}

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
    .use(getGameMiddleware({
      id: true,
      room_name: true,
      player_list: true
    }))
    .mutation(async ({ ctx: { game, db }, input: { playerName } }) => {

      if (!!game.player_list[playerName]) throw new TRPCError({
        code: "UNAUTHORIZED",
        message: `Player ${playerName} is already in the room!`
      })

      console.log(`Registering ${playerName} in ${game.room_name}`);
      game.player_list[playerName] = "";

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

  leaveGame: publicProcedure
    .input(z.object({ roomName: z.string().min(3), playerName: z.string().min(3) }))
    .use(getGameMiddleware({
      id: true,
      room_name: true,
      player_list: true
    }))
    .mutation(async ({ ctx: { game, db }, input: { roomName, playerName } }) => {
      // const remote_addr = ctx.headers.get('x-forwarded-for') ?? UNKOWN_HOST_IP;

      if (!game) throw new TRPCError({
        code: "BAD_REQUEST",
        message: `There is no active room: ${roomName}`,
      });
      if (!game.player_list[playerName]) throw new TRPCError({
        code: "UNAUTHORIZED",
        message: `Player ${playerName} is not in the room!`
      })

      game.player_list[playerName] = "";

      console.log(`${playerName} left ${game.room_name} room`)
      if (game.player_list.length) {
        await db.update(games)
          .set(game)
          .where(eq(games.room_name, game.room_name))
          .execute()
      } else { // all players gone!
      console.log(`room ${game.room_name} closed`)
      await db.delete(games)
          .where(eq(games.room_name, game.room_name))
          .execute()
      }
      
      return true;
    }),

  players: publicProcedure
    .input(z.object({ roomName: z.string() }))
    .use(getGameMiddleware({
      player_list: true
    }))
    .query(async ({ ctx: { game: { player_list } } }) => {
      return player_list;
    }),

  checkIn: publicProcedure
    .input(z.object({ roomName: z.string().min(3), playerName: z.string().min(3), socket_id: z.string().regex(/random-user-id:0.\d{6}/) }))
    .use(getGameMiddleware({
      id: true,
      room_name: true,
      player_list: true
    }))
    .mutation(async ({ ctx: { game }, input: { playerName, socket_id } }) => {
      console.log(`${playerName} checked in as ${socket_id} to room ${game.room_name}`);
      const res = await pusherServerClient.get({ path: `/channels/presence-${game.room_name}/users` });
      if (res.status === 200) {
        try {
          const { users } = z.object({users: z.object({})}).parse(await res.text())
          if (users) {
            console.log(`Connections to ${game.room_name} socket:======`);
            console.log(users);
            console.log(`end ${game.room_name} connections =======`);
          }
        } catch (_) {}
      }
      for (const player in game.player_list) {
        if (player === playerName) {
          game.player_list[player] = socket_id
        };
        console.log(`send update{${playerName} => ${game.room_name}} to ${player}`);
        try {
          await pusherServerClient.trigger(
            `${game.room_name}`,
            'new-player',
            {playerName, socket_id}
          );
        } catch (e) {
          console.log(`Failed to send update to ${player}`)
          console.error(e);
        }
      }
    }),

  clear: publicProcedure.mutation(async ({ ctx: { db }}) => {
    await db.delete(games).execute();
  }),

  post: publicProcedure
    .input(z.object({text: z.string(), roomId: z.string()}))
    .mutation(async ({ input: { text, roomId }}) => {
        console.log(`Got message |${text}| in room |${roomId}|`);
        
        try {
          await pusherServer.trigger(roomId, 'message', text)
        } catch (e) {
          console.error(`failed to publish ${text} message in room ${roomId}...`, e);
        }

        //   await db.message.create({
        //     data: {
        //       text,
        //       chatRoomId: roomId,
        //     },
        //   })

        return { success: true };
    }),
});
