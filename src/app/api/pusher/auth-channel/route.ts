import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { pusherServer } from "@pusher/server"
import { mindUserZod, userId } from "@lib/mind";


export async function POST(req: NextRequest) {
  // console.log(await req.text());
  const query_params = Object.fromEntries(new URLSearchParams(await req.text()).entries());
  const { channel_name, socket_id, playerName, roomName } = z
    .object({ channel_name: z.string(), socket_id: z.string() })
    .merge(mindUserZod)
    .parse(query_params);

  const user_id = userId({roomName, playerName});

  const auth = pusherServer.authorizeChannel(socket_id, channel_name, {
    user_id,
    user_info: {
      user_id,
      playerName,
      roomName
    },
  });
  console.log(`Authorized ${channel_name} channel for ${playerName} (socket ${socket_id}) in room ${roomName}`)
  return NextResponse.json(auth);
}
