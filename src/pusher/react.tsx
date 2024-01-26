import { createContext, useContext } from "react";
import PusherClient from "pusher-js";
import type { PresenceChannel } from "pusher-js";

import type { MindUser } from "@lib/mind";
import useLazyRef from "@hooks/useLazyRef";
import { env } from "@env";
import { PresenceFromDataAndId } from "./shared";

PusherClient.logToConsole = true;
PusherClient.log = (message: string) => {
  if (typeof message !== "string") {
    console.log(message);
    return
  }
  if (message.includes("Error")) {
    const err = new Error();
    console.log(message, "<-- had error");
    console.error(err.stack, "<-- the stack");
  }
}
const PusherClientContext = createContext<PusherClient|undefined>(undefined);

interface PusherClientProviderProps {
  mindUser: MindUser
}
export function PusherClientProvider({ mindUser, children }: React.PropsWithChildren<PusherClientProviderProps>) {
  const storeRef = useLazyRef(() => {
    // const mu_json = JSON.stringify(mindUser);
    // console.log("create boi with mind user: ", mu_json);
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
    
    typeof window !== "undefined" && console.log(pusherClient);
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



type PresenceSubscribedCbData<UserData, UserId extends string, PresenceData extends PresenceFromDataAndId<UserData, UserId>> = {
  members: Record<UserId, PresenceData>;
  count: number;
  myID: UserId;
  me: {
    id: UserId;
    info: PresenceData
  };
}
export function bindPresenceSubscribed<
    UserData,
    UserId extends string = string,
    PresenceData extends PresenceFromDataAndId<UserData, UserId> = PresenceFromDataAndId<UserData, UserId>
  >(
  presenceChannel: PresenceChannel,
  callback: (data: PresenceSubscribedCbData<UserData, UserId, PresenceData>) => void
) {
  presenceChannel.bind('pusher:subscription_succeeded', callback);
  return callback;
}
export function unbindPresenceSubscribed<
    UserData,
    UserId extends string = string,
    PresenceData extends PresenceFromDataAndId<UserData, UserId> = PresenceFromDataAndId<UserData, UserId>
  >(
  presenceChannel: PresenceChannel,
  callback: (data: PresenceSubscribedCbData<UserData, UserId, PresenceData>) => void
) {
  presenceChannel.unbind('pusher:subscription_succeeded', callback);
}


type PresenceMemberAddedCbData<UserData, UserId extends string, PresenceData extends PresenceFromDataAndId<UserData, UserId>> = {
  id: UserId;
  info: PresenceData;
};
export function bindPresenceMemberAdded<
    UserData,
    UserId extends string = string,
    PresenceData extends PresenceFromDataAndId<UserData, UserId> = PresenceFromDataAndId<UserData, UserId>
  >(
  presenceChannel: PresenceChannel,
  callback: (data: PresenceMemberAddedCbData<UserData, UserId, PresenceData>) => void
) {
  presenceChannel.bind('pusher:member_added', callback);
  return callback;
}
export function unbindPresenceMemberAdded<
    UserData,
    UserId extends string = string,
    PresenceData extends PresenceFromDataAndId<UserData, UserId> = PresenceFromDataAndId<UserData, UserId>
  >(
  presenceChannel: PresenceChannel,
  callback: (data: PresenceMemberAddedCbData<UserData, UserId, PresenceData>) => void
) {
  presenceChannel.unbind('pusher:member_added', callback);
}


type PresenceMemberRemovedCbData<UserData, UserId extends string, PresenceData extends PresenceFromDataAndId<UserData, UserId>> = {
  id: UserId;
  info: PresenceData;
};
export function bindPresenceMemberRemoved<
    UserData,
    UserId extends string = string,
    PresenceData extends PresenceFromDataAndId<UserData, UserId> = PresenceFromDataAndId<UserData, UserId>
  >(
  presenceChannel: PresenceChannel,
  callback: (data: PresenceMemberRemovedCbData<UserData, UserId, PresenceData>) => void
) {
  presenceChannel.bind('pusher:member_removed', callback);
  return callback;
}
export function unbindPresenceMemberRemoved<
    UserData,
    UserId extends string = string,
    PresenceData extends PresenceFromDataAndId<UserData, UserId> = PresenceFromDataAndId<UserData, UserId>
  >(
  presenceChannel: PresenceChannel,
  callback: (data: PresenceMemberRemovedCbData<UserData, UserId, PresenceData>) => void
) {
  presenceChannel.unbind('pusher:member_removed', callback);
}