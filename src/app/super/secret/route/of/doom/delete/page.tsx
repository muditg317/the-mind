import { redirect } from "next/navigation";

// import { api } from "@_trpc/server";

export default async function Page() {
//   await api.games.clear.mutate();
  redirect("/");
}


// /super/secret/route/of/doom/delete