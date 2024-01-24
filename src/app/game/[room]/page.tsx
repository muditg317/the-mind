"use client"
import { getServerSideProps } from "next/dist/build/templates/pages";
// import { PageProps } from ".next/types/app/game/[room]/page";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "~/trpc/react";


export default function Page({ params }: {params:{room:string}}) {
  const router = useRouter();
  const leaveGame = api.games.leaveGame.useMutation({
    onSuccess: () => {
      router.push("");
    }
  });

  const playerName = localStorage.getItem("playerName");
  // console.log(`loaded player name ${playerName}`);
  if (!playerName) {
    router.replace("");
    return
  }

  const room = params.room;

  useEffect(() => {
    return () => {
      leaveGame.mutate({
        roomName: room,
        playerName
      })
    }
  }, [playerName]);

  return <>
    YAy you're in the {room} and your name is {playerName}
  </>
}