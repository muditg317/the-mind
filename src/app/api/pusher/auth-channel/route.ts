import type { NextApiRequest, NextApiResponse } from "next"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { pusherServerClient } from "@server/pusher"

export async function POST(req: NextRequest) {
  const query_params = Object.fromEntries(new URLSearchParams(await req.text()).entries())
  // req.
  const { channel_name, socket_id } = z
    .object({ channel_name: z.string(), socket_id: z.string() })
    .parse(query_params)
  
  const user_id = req.headers.get("user_id")

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
  return NextResponse.json(auth);
}