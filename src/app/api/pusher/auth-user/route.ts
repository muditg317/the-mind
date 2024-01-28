import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getUsersInRoom, pusherServer } from "@pusher/server"
import { mindUserZod, userId } from "@lib/mind";
import { sendGameUpdates } from "@server/helpers/pusher-updates";


export async function POST(req: NextRequest) {
  const query_params = Object.fromEntries(new URLSearchParams(await req.text()).entries());
  const { socket_id, playerName, roomName } = z
    .object({ socket_id: z.string() })
    .merge(mindUserZod)
    .parse(query_params);

  const id = userId({roomName, playerName});
  // console.log(`Trying to auth user with id: |${id}|`)

  const room_user_ids = (await getUsersInRoom(roomName))
    .filter(other_id => other_id !== id);

  console.log(`Beginning auth for user ${playerName} (socket ${socket_id}) in ${roomName}`)
  const auth = pusherServer.authenticateUser(socket_id, {
    id,
    user_info: {
      id,
      playerName,
      roomName
    },
    watchlist: room_user_ids
  })
  console.log(`Authorized user ${playerName} (socket ${socket_id}) in ${roomName}`)
  console.log(`current users in ${roomName}: `, room_user_ids);

  await sendGameUpdates(roomName, id);
  return NextResponse.json(auth, { status: 200 });
}