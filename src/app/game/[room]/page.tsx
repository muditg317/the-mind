import { api } from "@_trpc/server";

import dynamic from 'next/dynamic'
// import { GameView } from "@components/game-view"
import { redirect } from "next/navigation";

const GameViewNoSSR = dynamic(() => import('@components/game-view'), { ssr: false })

export default async function Page({ params }: {params:{room:string}}) {
  const room = params.room;
  let players: Record<string, string>;
  try {
    players = await api.games.players.query({
      roomName: room
    });
    // console.log("game has the following players", players);
  } catch (_) {
    // console.log("failed to fetch players");
    redirect("/");
  }

  return <GameViewNoSSR room={room} initialPlayers={players} />;
}