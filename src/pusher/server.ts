import PusherServer from "pusher"
import { z } from "zod";

import { env } from "@env"

import { presenceChannelName } from "./shared";
import { gameChannelName } from "@lib/mind";
import { type NextRequest } from "next/server";

export const pusherServer = new PusherServer({
  appId: env.PUSHER_APP_ID,
  key: env.NEXT_PUBLIC_PUSHER_KEY,
  secret: env.PUSHER_SECRET,
  cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
  useTLS: true,
});

type PusherWebhookEvent = 
  | { name: "channel_occupied", channel: string }
  | { name: "channel_vacated", channel: string }
  | { name: "cache_miss", channel: string }
  | { name: "member_added", channel: `presence-${string}`, user_id: string }
  | { name: "member_removed", channel: `presence-${string}`, user_id: string }
  | { name: "client_event",
      channel: string,
      event: string,
      data: string,
      socket_id: string,
      user_id: string
    }
  | { name: "subscription_count", channel: string, subscription_count: string }
;

export async function webhookEvents(req: NextRequest) {
  const reqBody = await req.text();
  const rawHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    rawHeaders[key] = value;
  })

  const webhook = pusherServer.webhook({
    headers: rawHeaders,
    rawBody: reqBody,
  });

  if (!webhook.isValid()) throw new Error(`Webhook POST invalid! -- body=\n===\n${reqBody}\n===\n`);


  const events = webhook.getEvents() as PusherWebhookEvent[];
  // console.log(`Got pusher webhook at ${webhook.getTime()}: [${events.map(event => `${event.channel}:${event.name}`)}]`);

  return events;
}

export const pusherServerFetch = async <Out, Def extends z.ZodTypeDef, In>(path: string, parser: z.ZodType<Out, Def, In>) => {
  const res = await pusherServer.get({ path });
  if (res.status !== 200) throw new Error(`pusher.get on ${path} failed with code=${res.status} -- ${res.statusText}`);
  return parser.parse(await res.json());
}

export const getUsersInRoom = async (roomName: string) => {
  return await pusherServerFetch(
    `/channels/${presenceChannelName(gameChannelName(roomName))}/users`,
    z.object({ users: z.array(z.object({ id: z.string() }))})
  );
}