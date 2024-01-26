import { useCallback, useEffect, useState } from "react";
import type { PresenceChannel, Channel } from "pusher-js";

import { PresenceFromDataAndId, presenceChannelName } from "@pusher/shared";
import { bindPresenceMemberAdded, bindPresenceMemberRemoved, bindPresenceSubscribed, unbindPresenceMemberAdded, unbindPresenceMemberRemoved, unbindPresenceSubscribed, usePusherClient } from "@pusher/react";
import useLazyRef from "@hooks/useLazyRef";
import { MindUser, MindUserId } from "@lib/mind";

export function usePresenceChannel(base_channel_name: string) {
  const pusherClient = usePusherClient();
  const presence_channel_name = presenceChannelName(base_channel_name);
  const presenceChannelRef = useLazyRef(
    () => {
      let channel = pusherClient.channel(presence_channel_name);
      if (!channel) channel = pusherClient.subscribe(presence_channel_name);
      return channel as PresenceChannel;
    },
    useCallback((channel: PresenceChannel) => {
      if (channel.subscribed) {
        channel.unbind_all();
        pusherClient.unsubscribe(presence_channel_name);
      }
    }, [pusherClient, presence_channel_name])
  );

  return presenceChannelRef.current;
}

export function useMemberTracker<
    UserData,
    UserId extends string,
    PresenceData extends PresenceFromDataAndId<UserData, UserId> = PresenceFromDataAndId<UserData, UserId>,
    StoredType extends PresenceFromDataAndId<object, UserId> = PresenceData,
  >(
  base_channel_name: string,
  onMemberLoad: (data: PresenceData) => StoredType
) {
  const presenceChannel = usePresenceChannel(base_channel_name);

  const [storedMembers, setStoredMembers] = useState<StoredType[]>([]);

  useEffect(() => {
    const presenceSubscrCb = bindPresenceSubscribed<UserData, UserId, PresenceData>(presenceChannel, ({members}) => {
      // console.log("subscribed", members);
      setStoredMembers(Object.values<PresenceData>(members).map(member => onMemberLoad(member)));
    });
    const presenceMemAddCb = bindPresenceMemberAdded<UserData, UserId, PresenceData>(presenceChannel, ({info}) => {
      // console.log("added", info);
      setStoredMembers(members => [...members, onMemberLoad(info)]);
    })
    const presenceMemRemoveCb = bindPresenceMemberRemoved<UserData, UserId, PresenceData>(presenceChannel, ({id}) => {
      // console.log("removed", id);
      setStoredMembers(members => members.filter(member => member.user_id !== id));
    })
    // console.log("set up member tracking");

    return () => {
      // console.log("tear down member tracking");
      unbindPresenceSubscribed(presenceChannel, presenceSubscrCb);
      unbindPresenceMemberAdded(presenceChannel, presenceMemAddCb);
      unbindPresenceMemberRemoved(presenceChannel, presenceMemRemoveCb);
    }
  }, [presenceChannel]);

  return storedMembers;
}