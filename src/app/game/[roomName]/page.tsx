import { db } from "@server/db";
import { getGameStateFromDatabaseGame } from "@server/helpers/game-transform";

import dynamic from 'next/dynamic'
import { redirect } from "next/navigation";

const MindPageNoSSR = dynamic(() => import('@components/mind-page'), { ssr: false })

export default async function Page({ params }: {params:{roomName:string}}) {
  const roomName = params.roomName;

  const game = (await db.query.games.findFirst({
      where: ({ room_name }, { eq }) => eq(room_name, roomName),
      columns: {
        room_name: true,
        player_list: true,
        started: true,
        level: true,
        played_cards: true,
      }
    }).execute());
  if (!game) redirect("/");

  const gameState = await getGameStateFromDatabaseGame(game);

  return <MindPageNoSSR
    mindUserInfo={{
      roomName,
    }}
    initialGameState={gameState}
  />;
}