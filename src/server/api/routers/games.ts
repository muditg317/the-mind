import { eq } from "drizzle-orm/sql/expressions/conditions";
import { z } from "zod";

import { TRPCError } from "@trpc/server"
import { createTRPCRouter, publicProcedure } from "@server/api/trpc";
import { games } from "@server/db/schema";
import { getGameMiddleware } from "../middleware/games";
import { defaultPlayerPrivateState, mindPlayerNameZod, mindRoomNameZod, mindUserZod, userId } from "@lib/mind";
import { UNKNOWN_HOST_IP } from "@lib/utils";
import { getUsersInRoom } from "@pusher/server";
import { handleRoomEmpty, sendGameUpdatesToAll } from "@server/helpers/pusher-updates";


export const gamesRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ roomName: mindRoomNameZod, hostName: mindPlayerNameZod }))
    .mutation(async ({ ctx: { db, headers }, input: {roomName, hostName} }) => {
      const remoteAddr = headers.get('x-forwarded-for') ?? UNKNOWN_HOST_IP;
      const playerId = userId({ roomName, playerName: hostName });

      const existingRoom = await db.query.games.findFirst({
        where: ({ room_name }, { eq }) => eq(room_name, roomName),
        columns: {
          id: true,
        }
      }).execute();
      if (existingRoom) {
        const activeUserIds = await getUsersInRoom(roomName);
        if (!activeUserIds.length) await handleRoomEmpty(roomName);
      }

      await db.insert(games).values({
        room_name: roomName,
        host_ip: remoteAddr,
        host_name: hostName,
        player_list: {[playerId]: {
          roomName,
          playerName: hostName,
          ...defaultPlayerPrivateState()
        }},
      });
      console.log(`created ${roomName} room hosted by ${hostName}`);
    }),

  getOpenRooms: publicProcedure.query(({ ctx }) => {
    return ctx.db.query.games.findMany({
      orderBy: (games, { desc }) => [desc(games.updatedAt)],
      where: ({ locked, started }, { eq, not, and }) => and(
        not(eq(started, true)),
        not(eq(locked, true))
      ),
      columns: {
        room_name: true
      }
    }).then(games => games.map(game => game.room_name));
  }),

  attemptJoin: publicProcedure
    .input(mindUserZod)
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
        ...defaultPlayerPrivateState()
      };
      player.checkedIn = false;

      await db.update(games)
        .set(game)
        .where(eq(games.room_name, game.room_name))
        .execute();

      console.log(`${playerName} joined ${game.room_name} room`);

      const activeUserIds = await getUsersInRoom(game.room_name);
      if (!activeUserIds.length) await handleRoomEmpty(game.room_name);
      await sendGameUpdatesToAll(game.room_name);

      return {
        roomName: game.room_name,
        playerName: playerName
      };
    }),

  players: publicProcedure
    .input(z.object({ roomName: mindRoomNameZod }))
    .use(getGameMiddleware({
      player_list: true
    }))
    .query(async ({ ctx: { game: { player_list } } }) => {
      return player_list;
    }),

  // clear: publicProcedure.mutation(async ({ ctx: { db: _db }}) => {
  //   // await db.delete(games).execute();
  // }),
});
