import { TRPCError, experimental_standaloneMiddleware } from "@trpc/server"
import { type TheMindDatabase } from "@server/db"

type GamesColumnQuery = Partial<Record<keyof NonNullable<TheMindDatabase["_"]["schema"]>["games"]["columns"], boolean>>
export function getGameMiddleware<Cols extends GamesColumnQuery>(columns: Cols) {
  return experimental_standaloneMiddleware<{
    ctx: { db: TheMindDatabase }
    input: { roomName: string }
  }>().create(async ({ ctx: { db }, input: { roomName }, next }) => {
    // const remote_addr = ctx.headers.get('x-forwarded-for') ?? UNKOWN_HOST_IP;

    const game = await db.query.games.findFirst({
      where: ({ room_name }, { eq, and }) => and(
        eq(room_name, roomName),
        // eq(host_ip, remote_addr)
      ),
      columns: columns
    }).execute();

    if (!game) throw new TRPCError({
      code: "BAD_REQUEST",
      message: `There is no active room: ${roomName}`,
    });

    return next({
      ctx: {
        game
      }
    });
  })
}