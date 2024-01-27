
export function presenceChannelName(channel_name: string) {
  return `presence-${channel_name}`;
}
export function baseChannelName(presence_channel_name: string) {
  return presence_channel_name.replace("presence-", "");
}

export type PresenceFromDataAndId<UserData, UserId extends string> = UserData & {user_id: UserId};