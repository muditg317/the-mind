import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@server/api/trpc";
import { pusherServer } from "@pusher/server";
import { gameChannelName, mindUserZod } from "@lib/mind";


export const chatRouter = createTRPCRouter({
  post: publicProcedure
    .input(z.object({text: z.string(), mindUser: mindUserZod }))
    .mutation(async ({ input: { text, mindUser: { roomName, playerName } }}) => {
      const channelNameGame = gameChannelName(roomName);
      console.log(`Got message |${text}| from |${playerName}| in room |${roomName}|`);

      try {
        await pusherServer.trigger(channelNameGame, 'mind:message', `${playerName}: ${text}`)
      } catch (e) {
        console.error(`failed to publish ${text} message in room ${roomName}...`, e);
      }

      return { success: true };
    }),
});
