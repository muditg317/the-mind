import { type NextRequest, NextResponse } from "next/server";
// import { db } from '@server/db'
import { z } from "zod";
import { pusherServer } from '@lib/pusher/server'

export async function POST(req: NextRequest) {
  const { text, roomId } = z.object({text: z.string(), roomId: z.string()}).parse(await req.json());

  console.log(`Got message |${text}| in room |${roomId}|`);

  void pusherServer.trigger(roomId, 'message', text)

//   await db.message.create({
//     data: {
//       text,
//       chatRoomId: roomId,
//     },
//   })

  return NextResponse.json({ success: true });
}