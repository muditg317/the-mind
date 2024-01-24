import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { pusherServerClient } from "@server/pusher"


export async function POST(req: NextRequest) {
  const query_params = Object.fromEntries(new URLSearchParams(await req.text()).entries());
  console.log(query_params)
  const { socket_id } = z
    .object({ socket_id: z.string() })
    .parse(query_params)

  const user_id = req.headers.get("randomUserId")

  if (!user_id || typeof user_id !== 'string') {
    console.log("no valid user: ", user_id)
    return NextResponse.json("lol", { status: 404 })
  }
  const auth = pusherServerClient.authenticateUser(socket_id, {
    id: user_id,
    name: 'ironman',
  })
  console.log(`Authorized user ${user_id} (socket ${socket_id})`)
  return NextResponse.json(auth);
}