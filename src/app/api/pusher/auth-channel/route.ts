import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm";

import { pusherServer } from "@pusher/server"
import { gameChannelName, mindUserZod, userId } from "@lib/mind";
import { db } from "@server/db";
import { games } from "@server/db/schema";


export async function POST(req: NextRequest) {
  const query_params = Object.fromEntries(new URLSearchParams(await req.text()).entries());
  const { channel_name, socket_id, playerName, roomName } = z
    .object({ channel_name: z.string(), socket_id: z.string() })
    .merge(mindUserZod)
    .parse(query_params);

  const user_id = userId({roomName, playerName});

  // console.log(`Begin auth on ${channel_name} channel for ${playerName} (socket ${socket_id}) in room ${roomName}`)

  let game: Awaited<ReturnType<typeof db.query.games.findFirst<{
    columns: {player_list: true}
  }>>> | undefined;
  if (channel_name === gameChannelName(roomName)) {
    game = await db.query.games.findFirst({
      where: ({ room_name }, { eq, and }) => and(
        eq(room_name, roomName),
      ),
      columns: {
        player_list: true,
      }
    }).execute();
    if (!game) throw new Error(
      `Cannot connect to non-existent room ${roomName}!`
    );

    if (!(playerName in game.player_list)) throw new Error(
      `Player ${playerName} not in room ${roomName}! Cannot create socket`
    );

    // const player = game.player_list[user_id]!;
    // if (player.checkedIn) throw new Error(
    //   `Player ${playerName} is already checked in to room ${roomName}!`
    // );
  }

  const auth = pusherServer.authorizeChannel(socket_id, channel_name, {
    user_id,
    user_info: {
      user_id,
      playerName,
      roomName
    },
  });

  if (game) {
    game.player_list[user_id]!.socketId = socket_id;
    await db.update(games)
      .set(game)
      .where(eq(games.room_name, roomName))
      .execute();
  }
  // console.log(`Authorized ${channel_name} channel for ${playerName} (socket ${socket_id}) in room ${roomName}`)
  return NextResponse.json(auth);
}
