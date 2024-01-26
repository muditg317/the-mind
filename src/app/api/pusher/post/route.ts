// import { db } from '@server/db'
import { pusherServer } from '@lib/pusher/server'

export async function POST(req: Request) {
  const { text, roomId } = await req.json()

  console.log(`Got message |${text}| in room |${roomId}|`);

  pusherServer.trigger(roomId, 'message', text)

//   await db.message.create({
//     data: {
//       text,
//       chatRoomId: roomId,
//     },
//   })

  return new Response(JSON.stringify({ success: true }))
}