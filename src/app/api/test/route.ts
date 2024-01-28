import { pusherServer } from "@pusher/server";
import { sendGameUpdates } from "@server/helpers/pusher-updates";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const testRoom = "bruh";
  const testPlayerId = ",.-.,mind-player,.-.,room-bruh,.-.,name-bruh,.-.,";
  await sendGameUpdates(testRoom, testPlayerId);

  // pusherServer.sendToUser(testPlayerId, "wef", "WEf");

  return NextResponse.json({})
}