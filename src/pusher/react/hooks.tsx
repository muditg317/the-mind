import { useCallback, useEffect, useReducer, useState } from "react";
import type { Reducer, ReducerState, ReducerAction } from "react";
import type { Channel, PresenceChannel } from "pusher-js";
import type PusherClient from "pusher-js";

import { type PresenceFromDataAndId, presenceChannelName } from "@pusher/shared";
import { bindPresenceMemberAdded, bindPresenceMemberRemoved, bindPresenceSubscribed, unbindPresenceMemberAdded, unbindPresenceMemberRemoved, unbindPresenceSubscribed, usePusherClient } from "@pusher/react";
import useLazyRef from "@hooks/useLazyRef";
import {  } from "@trpc/react-query/shared";
import { type UseMutationResult } from "@tanstack/react-query";
import { type EmptyObj } from "@lib/utils";

export function useChannel(channel_name: string) {
  const pusherClient = usePusherClient();
  const channelRef = useLazyRef(
    () => {
      let channel = pusherClient.channel(channel_name);
      if (!channel) channel = pusherClient.subscribe(channel_name);
      return channel;
    },
    useCallback((channel: Channel) => {
      if (channel.subscribed) {
        channel.unbind_all();
        pusherClient.unsubscribe(channel_name);
      }
    }, [pusherClient, channel_name])
  );

  return channelRef.current;
}
export function usePresenceChannel(base_channel_name: string) {
  return useChannel(presenceChannelName(base_channel_name)) as PresenceChannel;
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
  }, [presenceChannel, onMemberLoad]);

  return storedMembers;
}

export function useMutationOnSubscribe<TData, TError, TVariables, TContext>(base_channel_name: string, mutation: UseMutationResult<TData, TError, TVariables, TContext>, mutationData: TVariables) {
  const channel = useChannel(base_channel_name);

  useEffect(() => {
    // const presenceMemRemoveCb = bindPresenceMemberRemoved<UserData, UserId, PresenceData>(channel, ({id}) => {
    //   // console.log("removed", id);
    //   setStoredMembers(members => members.filter(member => member.user_id !== id));
    // })
    // // console.log("set up member tracking");
    const callback = (_data: EmptyObj) => {
      // console.log("pusher subscribed!", base_channel_name, "data:", data);
      mutation.mutate(mutationData);
    }
    channel.bind("pusher:subscription_succeeded", callback);

    return () => {
      // console.log("tear down member tracking");
      // unbindPresenceMemberRemoved(channel, presenceMemRemoveCb);
      channel.unbind("pusher:subscription_succeeded", callback);
    }
  }, [channel, mutation, mutationData]);
}

type CommonProps<A,B> = {
  [K in keyof A & keyof B]: A[K] | B[K]
}

export function useEventSubscriptionReducer<
    C extends CommonProps<Channel, PusherClient["user"]>,
    R extends Reducer<any, any>,
  >(
  channels: C[],
  eventName: string,
  initialState: ReducerState<R>,
  reducer: R
) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const callback = (evt: ReducerAction<R>) => dispatch(evt);
    channels.forEach(channel => {
      console.log("subscribed to ", channel, `event ${eventName} for game updates`);
      channel.bind(eventName, callback);
    });

    return () => {
      channels.forEach(channel => {
        console.log("unsubscribed from ", channel, `event ${eventName} for game updates`);
        channel.unbind(eventName, callback)
      });
    }
  }, [eventName, dispatch, ...channels]);

  return state;
}

