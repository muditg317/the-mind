import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { pusherServerClient } from "@server/pusher"

export async function POST(req: NextRequest) {
  const query_params = Object.fromEntries(new URLSearchParams(await req.text()).entries());
  console.log(query_params)
  const { channel_name, socket_id } = z
    .object({ channel_name: z.string(), socket_id: z.string() })
    .parse(query_params)
  
  const user_id = req.headers.get("randomUserId")

  if (!user_id || typeof user_id !== 'string') {
    console.log("no valid user: ", user_id)
    return NextResponse.json("lol", { status: 404 })
  }
  const auth = pusherServerClient.authorizeChannel(socket_id, channel_name, {
    user_id,
    user_info: {
      name: 'superman',
    },
  });
  console.log(`Authorized user ${user_id} (socket ${socket_id}) for ${channel_name}`)
  console.log(auth);

  // const res = await pusherServerClient.get({ path: `/channels/${channel_name}/users` });
  // if (res.status === 200) {
  //   const body = await res.json();
  //   const users = body.users;
  //   console.log(`Connections to ${channel_name} socket:======`);
  //   console.log(users);
  //   console.log(`end ${channel_name} connections =======`);
  // }

  return NextResponse.json(auth);
}