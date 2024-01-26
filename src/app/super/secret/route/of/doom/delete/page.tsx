"use client"
import { useRouter } from "next/navigation";

import { api } from "@_trpc/react";
import { useEffect } from "react";

export default function Page() {
  const router = useRouter();
  const clear = api.games.clear.useMutation({
    onSuccess: () => {
      router.replace("/");
    }
  });

  useEffect(() => {
    clear.mutate();
  }, [clear]);

  return <>
  {clear.isLoading
    ? <p>deleting everything!</p>
    : <p>byebye</p>}
  </>
}


// /super/secret/route/of/doom/delete