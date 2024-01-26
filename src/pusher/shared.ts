
export function presenceChannelName(channel_name: string) {
  return `presence-${channel_name}`;
}
export type PresenceFromDataAndId<UserData, UserId extends string> = UserData & {user_id: UserId};