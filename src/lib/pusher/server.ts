import PusherServer from 'pusher'

import { env } from "@env";

export const pusherServer = new PusherServer({
  appId: env.PUSHER_APP_ID,
  secret: env.PUSHER_SECRET,
  key: env.NEXT_PUBLIC_PUSHER_KEY,
  cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true,
})
