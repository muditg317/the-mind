// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  mysqlTableCreator,
  timestamp,
  varchar,
  json,
} from "drizzle-orm/mysql-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = mysqlTableCreator((name) => `the-mind_${name}`);

export const games = createTable(
  "games",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    room_name: varchar("room_name", { length: 256 }).unique().notNull(),
    host_ip: varchar("host_ip", { length: 256 }).notNull(),
    host_name: varchar("host_name", { length: 50 }).notNull(),
    player_list: json("player_list").$type<Record<string,string>>().notNull(),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updatedAt").onUpdateNow(),
  },
  (example) => ({
    nameIndex: index("name_idx").on(example.room_name),
  })
);