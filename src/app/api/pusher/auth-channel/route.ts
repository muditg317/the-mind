import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { pusherServer } from "@pusher/server"
import { gameChannelName, mindUserZod, userId } from "@lib/mind";
import { db } from "@server/db";


export async function POST(req: NextRequest) {
  // console.log(await req.text());
  const query_params = Object.fromEntries(new URLSearchParams(await req.text()).entries());
  const { channel_name, socket_id, playerName, roomName } = z
    .object({ channel_name: z.string(), socket_id: z.string() })
    .merge(mindUserZod)
    .parse(query_params);

  const user_id = userId({roomName, playerName});

  if (channel_name === gameChannelName(roomName)) {
    const game = await db.query.games.findFirst({
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
  }

  // console.log(`Begin auth on ${channel_name} channel for ${playerName} (socket ${socket_id}) in room ${roomName}`)
  const auth = pusherServer.authorizeChannel(socket_id, channel_name, {
    user_id,
    user_info: {
      user_id,
      playerName,
      roomName
    },
  });
  // console.log(`Authorized ${channel_name} channel for ${playerName} (socket ${socket_id}) in room ${roomName}`)
  return NextResponse.json(auth);
}
