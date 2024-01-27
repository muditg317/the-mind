// import { TRPCError, experimental_standaloneMiddleware } from "@trpc/server"
// import { type TheMindDatabase } from "@server/db"
// import { getGameMiddleware } from "./games"
// import { userId } from "@lib/mind";
// import { UNKNOWN_HOST_IP } from "@lib/utils";
// import { MySqlColumn } from "drizzle-orm/mysql-core";
// import { Column, ColumnDataType } from "drizzle-orm";

// type TheMindGamesTableSchema = NonNullable<TheMindDatabase["_"]["schema"]>["games"]["columns"];

// type FieldType<K extends keyof TheMindGamesTableSchema> = {
//   [P in K]: TheMindGamesTableSchema[P] extends MySqlColumn<{
//     tableName: string,
//     notNull: boolean,
//     hasDefault: boolean,
//     name: string,
//     data: infer D,
//     dataType: ColumnDataType,
//     columnType: string,
//     driverParam: string | number,
//     enumValues: undefined,
//   }, object> ? D : never;
// };


// type test = FieldType<"host_ip"|"host_name">;

// export const hostOnlyMiddleware = experimental_standaloneMiddleware<{
//   ctx: { headers: Headers, game: FieldType<"host_ip"|"host_name"> }
//   input: { playerName: string }
// }>().create(({ ctx: { headers, game }, input: { playerName }, next }) => {
//   const remoteAddr = headers.get('x-forwarded-for') ?? UNKNOWN_HOST_IP;

//   const isHost = game.host_name === playerName && (
//     remoteAddr === game.host_ip
//     || remoteAddr === UNKNOWN_HOST_IP
//     || game.host_ip === UNKNOWN_HOST_IP
//   );
//   // console.log("name equal", game.host_name === playerName);
//   // console.log("ip equal", remoteAddr === game.host_name);
//   if (!isHost) throw new TRPCError({
//     code: "UNAUTHORIZED",
//     message: `Only the host(${game.host_name}) can control the room! You are (${playerName}). --- IP info: host=(${game.host_ip})  request=(${remoteAddr})`,
//   });

//   return next();
// });
