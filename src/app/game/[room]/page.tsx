import { api } from "@_trpc/server";

import { GameView } from "@components/game-view"
import { redirect } from "next/navigation";

export default async function Page({ params }: {params:{room:string}}) {
  const room = params.room;
  let players: string[];
  try {
    players = await api.games.players.query({
      roomName: room
    });
    // console.log("game has the following players", players);
  } catch (_) {
    // console.log("failed to fetch players");
    redirect("/");
  }

  return <GameView room={room} initialPlayers={players} />;
}