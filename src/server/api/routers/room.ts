import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@server/api/trpc";
import { getGameMiddleware } from "../middleware/games";
import { type MindUserId, mindUserZod, userId, GAME_COMPLETED_DELAY_MS_SEND_UPDATE } from "@lib/mind";
import { TRPCError } from "@trpc/server";
import { UNKNOWN_HOST_IP } from "@lib/utils";
import { games } from "@server/db/schema";
import { eq } from "drizzle-orm";
import { sendGameUpdates, sendGameUpdatesToAll } from "@server/helpers/pusher-updates";
import { getPlayerInfoFromDatabasePlayer, gameIsWon, gameIsLost } from "@server/helpers/game-transform";

export const roomRouter = createTRPCRouter({
  players: publicProcedure
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

  playerInfo: publicProcedure
    .input(mindUserZod)
    .use(getGameMiddleware({
      room_name: true,
      player_list: true
    }))
    .query(({ ctx: { game }, input: { playerName }}) => {
      const playerId = userId({roomName: game.room_name, playerName});
      if (!(playerId in game.player_list)) throw new TRPCError({
        code: "UNAUTHORIZED",
        message: `Cannot get player info: Player ${playerName} is not part of the ${game.room_name} room!`
      });

      const player = game.player_list[playerId]!;

      return getPlayerInfoFromDatabasePlayer(player);
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
    .mutation(async ({ ctx: { db, game }, input: { playerName }}) => {
      const playerId = userId({roomName: game.room_name, playerName});
      if (!(playerId in game.player_list)) throw new TRPCError({
        code: "UNAUTHORIZED",
        message: `Cannot toggle ready: Player ${playerName} is not part of the ${game.room_name} room!`
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
      player_list: true,
      locked: true,
      started: true,
      level: true,
      played_cards: true,
    }))
    .mutation(async ({ ctx: { db, headers, game }, input: { playerName }}) => {
      const remoteAddr = headers.get('x-forwarded-for') ?? UNKNOWN_HOST_IP;
      
      const isHost = game.host_name === playerName && (
        remoteAddr === game.host_ip
        || remoteAddr === UNKNOWN_HOST_IP
        || game.host_ip === UNKNOWN_HOST_IP
      );
      if (!isHost) throw new TRPCError({
        code: "UNAUTHORIZED",
        message: `Only the host(${game.host_name}) can control the room! You are (${playerName}). --- IP info: host=(${game.host_ip})  request=(${remoteAddr})`,
      });

      if (game.started) throw new TRPCError({
        code: "BAD_REQUEST",
        message: `The game is already started!`
      });
      game.started = true;

      game.played_cards = [];

      const deck = Array.from({length: 100}, (_, i) => i + 1);
      for (const playerId in game.player_list) {
        const player = game.player_list[playerId as MindUserId]!;
        player.cards = [];
        for (let i = 0; i < game.level; i++) {
          if (!deck.length) throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Level too high! There's no more cards`,
          });
          const card = deck.splice(Math.floor(Math.random()*deck.length), 1)[0]!;
          player.cards.push(card);
        }
      }

      await db.update(games)
        .set(game)
        .where(eq(games.room_name, game.room_name))
        .execute();

      console.log(`Started room ${game.room_name} game: `, Object.values(game.player_list).map(player => player.cards));

      await sendGameUpdatesToAll(game);
    }),

  playCard: publicProcedure
    .input(z.object({ card: z.number().int().min(1).max(100) }).merge(mindUserZod))
    .use(getGameMiddleware({
      id: true,
      host_ip: true,
      host_name: true,
      room_name: true,
      player_list: true,
      locked: true,
      started: true,
      level: true,
      played_cards: true,
    }))
    .mutation(async ({ ctx: { db, game }, input: { playerName, card }}) => {
      const playerId = userId({roomName: game.room_name, playerName});
      if (!(playerId in game.player_list)) throw new TRPCError({
        code: "UNAUTHORIZED",
        message: `Cannot play card: Player ${playerName} is not part of the ${game.room_name} room!`
      });

      const player = game.player_list[playerId]!;

      const cards = player.cards;
      if (!cards.includes(card)) throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot play ${card} card. Player ${playerName} doesn't have this card!`,
      });
      cards.splice(cards.indexOf(card), 1);

      game.played_cards.push(card);

      await db.update(games)
        .set(game)
        .where(eq(games.room_name, game.room_name))
        .execute();

      console.log(`Player ${playerName} played card ${card} in room ${game.room_name}`);

      await sendGameUpdates(game.room_name, playerId);

      const won = await gameIsWon(game);
      const lost = await gameIsLost(game);
      const over = won || lost;
      const overStr = won ? "won" : "lost";

      if (over) {
        console.log(`Room ${game.room_name} ${overStr} the game! Waiting ${GAME_COMPLETED_DELAY_MS_SEND_UPDATE/1000}s to send result...`);
        await new Promise((resolve) => setTimeout(resolve, GAME_COMPLETED_DELAY_MS_SEND_UPDATE));
        game.started = false;
        if (won) {
          game.level++;
        } else {
        }

        await db.update(games)
          .set(game)
          .where(eq(games.room_name, game.room_name))
          .execute();

        console.log(`Room ${game.room_name} is now on level ${game.level}`);
        await sendGameUpdatesToAll(game);
      }

      return true;
    }),
});
