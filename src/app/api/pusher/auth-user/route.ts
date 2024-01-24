import { type NextApiRequest, type NextApiResponse } from 'next'
import { z } from 'zod'

import { pusherServerClient } from '~/server/pusher'


export async function POST(req: NextApiRequest, res: NextApiResponse) {
  // console.log('body', z.object({}).parse(req.body))
  // const b: ReadableStream = req.body;
  // console.log(Buffer.from((await b.getReader().read()).value))
  const { socket_id } = z.object({ socket_id: z.string() }).parse(req.body)
  const { user_id } = req.headers

  if (!user_id || typeof user_id !== 'string') {
    res.status(404).send('lol')
    return
  }
  const auth = pusherServerClient.authenticateUser(socket_id, {
    id: user_id,
    name: 'ironman',
  })
  res.send(auth)
}