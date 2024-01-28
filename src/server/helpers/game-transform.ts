import type { MindPublicGameState, MindUserId, MindUserPrivateState } from "@lib/mind";
import type { ValueOf } from "@lib/utils";
import type { games } from "@server/db/schema";

export type GameSchema = typeof games.$inferSelect;
export async function getGameStateFromDatabaseGame(game: Pick<GameSchema, "player_list"|"started"|"level"|"played_cards">): Promise<MindPublicGameState> {
  const playerState: MindPublicGameState["playerState"] = {};
  for (const otherPlayerId in game.player_list) {
    const otherPlayer = game.player_list[otherPlayerId as MindUserId]!;
    const playerInfo: ValueOf<typeof playerState> = playerState[otherPlayer.playerName] = {
      ready: otherPlayer.checkedIn && otherPlayer.ready,
      cardsLeft: otherPlayer.cards.length,
    };
    if (!game.started) {
      playerInfo.visibleCards = otherPlayer.cards;
    }
  }

  const gameState = {
    started: game.started,
    level: game.level,
    played_cards: game.played_cards,
    playerState
  }

  return gameState;
}
export async function getPlayerInfoFromDatabasePlayer(player: Pick<ValueOf<GameSchema["player_list"]>, "checkedIn"|"ready"|"cards">): Promise<MindUserPrivateState> {
  const playerPrivateState = {
    checkedIn: player.checkedIn,
    ready: player.ready,
    cards: player.cards,
  }
  return playerPrivateState;
}


export async function gameIsWon(game: Pick<GameSchema, "player_list"|"played_cards">) {
  return !!game.played_cards.length
      && Object.values(game.player_list)
        .every(player => !player.cards.length)
      && game.played_cards
        .every((card, i, cards) => card > (cards[i-1] ?? 0));
}
export async function gameIsLost(game: Pick<GameSchema, "player_list"|"played_cards">) {
  const lastPlayed = game.played_cards.at(-1);
  return !!lastPlayed
      && (Object.values(game.player_list)
          .some(player => !!player.cards.length && player.cards.at(-1)! < lastPlayed)
        || game.played_cards
          .some((card, i, cards) => card < (cards[i-1] ?? 0))
      );
}