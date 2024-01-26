import { createContext, useContext } from "react";
import PusherClient from "pusher-js";
import { PresenceChannel } from "pusher-js";

import type { MindUser, MindUserPresence } from "@lib/mind";
import useLazyRef from "@hooks/useLazyRef";
import { env } from "@env";

PusherClient.logToConsole = true;
const PusherClientContext = createContext<PusherClient|undefined>(undefined);

interface PusherClientProviderProps {
  mindUser: MindUser
}
export function PusherClientProvider({ mindUser, children }: React.PropsWithChildren<PusherClientProviderProps>) {
  const storeRef = useLazyRef(() => {
    const pusherClient = new PusherClient(env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER,
      channelAuthorization: {
        endpoint: "/api/pusher/auth-channel",
        transport: "ajax",
        params: { ...mindUser },
      },
      userAuthentication: {
        endpoint: "api/pusher/auth-user",
        transport: "ajax",
        params: { ...mindUser },
      }
    });

    pusherClient.signin();

    return pusherClient;
  });

  return (
    <PusherClientContext.Provider value={storeRef.current}>
      {children}
    </PusherClientContext.Provider>
  )
}

export const usePusherClient = () => {
  const pusherClient = useContext(PusherClientContext);
  if (!pusherClient) throw new Error(`usePusherClient must be called from within PusherClientProvider`);
  return pusherClient;
}



type PresenceSubscriptionSucceededCallbackData<UserData, UserId extends string, PresenceData=UserData&{user_id:UserId}> = {
  members: Record<UserId, PresenceData>;
  count: number;
  myID: UserId;
  me: {
    id: UserId;
    info: PresenceData
  };
}
export function bindPresenceSubscribed<UserData, UserId extends string = string>(presenceChannel: PresenceChannel, callback: (data: PresenceSubscriptionSucceededCallbackData<UserData, UserId>) => void) {
  presenceChannel.bind('pusher:subscription_succeeded', callback);
  return callback;
}
export function unbindPresenceSubscribed<UserData, UserId extends string = string>(presenceChannel: PresenceChannel, callback: (data: PresenceSubscriptionSucceededCallbackData<UserData, UserId>) => void) {
  presenceChannel.unbind('pusher:subscription_succeeded', callback);
}


type PresenceMemberAddedCallbackData<UserData, UserId extends string, PresenceData=UserData&{user_id:UserId}> = {
  // event:"pusher:member_added";
  // channel: `presence-${string}`
  // data: {
  //   user_id: UserId;
  //   user_info: PresenceData
  // }
  id: UserId;
  info: PresenceData;
};
export function bindPresenceMemberAdded<UserData, UserId extends string = string>(presenceChannel: PresenceChannel, callback: (data: PresenceMemberAddedCallbackData<UserData, UserId>) => void) {
  presenceChannel.bind('pusher:member_added', callback);
  return callback;
}
export function unbindPresenceMemberAdded<UserData, UserId extends string = string>(presenceChannel: PresenceChannel, callback: (data: PresenceMemberAddedCallbackData<UserData, UserId>) => void) {
  presenceChannel.unbind('pusher:member_added', callback);
}


type PresenceMemberRemovedCallbackData<UserData, UserId extends string, PresenceData=UserData&{user_id:UserId}> = {
  // event:"pusher:member_removed";
  // channel: `presence-${string}`
  // data: {
  //   user_id: UserId;
  //   user_info: PresenceData
  // }
  id: UserId;
  info: PresenceData;
};
export function bindPresenceMemberRemoved<UserData, UserId extends string = string>(presenceChannel: PresenceChannel, callback: (data: PresenceMemberRemovedCallbackData<UserData, UserId>) => void) {
  presenceChannel.bind('pusher:member_removed', callback);
  return callback;
}
export function unbindPresenceMemberRemoved<UserData, UserId extends string = string>(presenceChannel: PresenceChannel, callback: (data: PresenceMemberRemovedCallbackData<UserData, UserId>) => void) {
  presenceChannel.unbind('pusher:member_removed', callback);
}