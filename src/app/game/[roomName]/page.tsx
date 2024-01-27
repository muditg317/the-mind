import { api } from "@_trpc/server";

import dynamic from 'next/dynamic'
// import { MindPage } from "@components/mind-page"
import { redirect } from "next/navigation";

const MindPageNoSSR = dynamic(() => import('@components/mind-page'), { ssr: false })

export default async function Page({ params }: {params:{roomName:string}}) {
  const roomName = params.roomName;

  const isValidGame = (await api.games.getOpenRooms.query()).some(room => room === roomName);
  if (!isValidGame) redirect("/");

  return <MindPageNoSSR mindUserInfo={{
    roomName,
  }} />;
}