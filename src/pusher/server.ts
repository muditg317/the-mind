import PusherServer from "pusher"
import { z } from "zod";

import { env } from "@env"

import { presenceChannelName } from "./shared";
import { gameChannelName } from "@lib/mind";

export const pusherServer = new PusherServer({
  appId: env.PUSHER_APP_ID,
  key: env.NEXT_PUBLIC_PUSHER_KEY,
  secret: env.PUSHER_SECRET,
  cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true,
})

export const pusherServerFetch = async <const Z extends z.ZodType>(path: string, parser: Z) => {
  const res = await pusherServer.get({ path });
  if (res.status !== 200) throw new Error(`pusher.get on ${path} failed with code=${res.status} -- ${res.statusText}`);
  return parser.parse(await res.json()) as z.infer<Z>;
}

export const getUsersInRoom = async (roomName: string) => {
  return await pusherServerFetch(
    `/channels/${presenceChannelName(gameChannelName(roomName))}/users`,
    z.object({ users: z.array(z.object({ id: z.string() })) })
  );
}