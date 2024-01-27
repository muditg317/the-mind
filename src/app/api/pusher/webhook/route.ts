import { type NextRequest, NextResponse } from "next/server";

import { db } from "@server/db";
import { getUsersInRoom, webhookEvents } from "@pusher/server";
import { baseChannelName } from "@pusher/shared";
import { type MindUserId, ROOM_VACATED_DELAY_MS_TO_DELETE_ROOM, getRoomNameFromGameChannel } from "@lib/mind";
import { games } from "@server/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const events = await webhookEvents(req);

  for (const event of events) {
    switch (event.name) {
      case "member_added":
      case "member_removed": {
          const channel = event.channel;
          const roomName = getRoomNameFromGameChannel(baseChannelName(channel));
          if (!roomName) continue;
          const inOutStr = event.name === "member_added" ? "in" : "out";

          const game = await db.query.games.findFirst({
            where: ({ room_name }, { eq, and }) => and(
              eq(room_name, roomName),
            ),
            columns: {
              player_list: true,
            }
          }).execute();
          if (!game) {
            (event.name === "member_added"
              ? console.error
              : console.warn
            )(`Cannot check-${inOutStr}: No game running in ${roomName} room!`)
            continue;
          }

          const playerId = event.user_id as MindUserId;
          if (!(playerId in game.player_list)) {
            (event.name === "member_added"
              ? console.error
              : console.warn
            )(`Cannot check-${inOutStr}: Player (id=${playerId}) is not part of the ${roomName} room!`);
            continue;
          }
          const player = game.player_list[playerId]!;

          player.checkedIn = event.name === "member_added";

          await db.update(games)
            .set(game)
            .where(eq(games.room_name, roomName))
            .execute();

          console.log(`${player.playerName} checked ${inOutStr} for room ${roomName}`);

          // if (event.name === "member_removed") {
          //   const {users: remainingActive} = await getUsersInRoom(roomName);
          //   console.log(`Remaining users: [${remainingActive}]`);
          // }
      } break;
      case "channel_occupied":
      case "channel_vacated": {
        const channel = event.channel;
        const roomName = getRoomNameFromGameChannel(baseChannelName(channel));
        if (!roomName) continue;

        const game = await db.query.games.findFirst({
          where: ({ room_name }, { eq, and }) => and(
            eq(room_name, roomName),
          ),
          columns: {
            player_list: true,
          }
        }).execute();
        if (!game) continue;

        // console.log(`Got channel event: ${roomName} -- ${event.name}`);
        if (event.name === "channel_vacated") {
          const timeStr = `${(ROOM_VACATED_DELAY_MS_TO_DELETE_ROOM/1000).toFixed(2)}s`;
          console.log(
            `Room ${roomName} has been vacated! Waiting ${timeStr} before deleting game.`
          );
          await new Promise(resolve => setTimeout(resolve, ROOM_VACATED_DELAY_MS_TO_DELETE_ROOM));
          const {users: activeUsers} = await getUsersInRoom(roomName);
          if (activeUsers.length) {
            console.log(`Found new users [${activeUsers.map(u=>u.id).join('|||')}] in ${roomName} room! Cancelling deleting.`);
          } else {
            console.log(`No new users after ${timeStr}... Deleting ${roomName} room.`)
            await db.delete(games)
              .where(eq(games.room_name, roomName))
              .execute();
            console.log(`Room ${roomName} deleted.`)
          }
        }
      } break;
      default:
        console.log(`Ignoring websocket event: ${event.name} on ${event.channel}`);
    }
  }

  return NextResponse.json({});
}
