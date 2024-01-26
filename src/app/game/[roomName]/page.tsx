import { api } from "@_trpc/server";

import dynamic from 'next/dynamic'
// import { MindPage } from "@components/mind-page"
import { redirect } from "next/navigation";

const MindPageNoSSR = dynamic(() => import('@components/mind-page'), { ssr: false })

export default async function Page({ params }: {params:{roomName:string}}) {
  const roomName = params.roomName;
  // let players: Record<string, boolean>;
  // try {
  //   players = await api.games.players.query({
  //     roomNameName: roomName
  //   });
  //   // console.log("game has the following players", players);
  // } catch (_) {
  //   // console.log("failed to fetch players");
  //   redirect("/");
  // }

  return <MindPageNoSSR mindUserInfo={{
    roomName,
  }} />;
}