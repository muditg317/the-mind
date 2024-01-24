"use client"
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

  const playerName = localStorage.getItem("playerName") ?? "";
  // console.log(`loaded player name ${playerName}`);

  const room = params.room;

  useEffect(() => {
    const exitingFunction = () => {
      leaveGame.mutate({
        roomName: room,
        playerName
      })
    };

    return () => {
      exitingFunction();
    };
  }, [playerName, leaveGame, room]);

  if (!playerName) {
    router.replace("");
    return
  }

  return <>
    Yay you&apos;re in the {room} and your name is {playerName}
  </>
}