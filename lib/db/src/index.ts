import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;
export let pool: pg.Pool;
export let db: DrizzleDb;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle(pool, { schema }) as any;
} else {
  console.warn("WARNING: DATABASE_URL is not set. Using in-memory fallback for Liked Songs and Playlists.");
  
  let mockFavorites: any[] = [];
  let mockPlaylists: any[] = [];
  let mockPlaylistTracks: any[] = [];
  let nextPlaylistId = 1;
  let nextPlaylistTrackId = 1;
  
  function getTableName(tableObj: any): string {
    if (!tableObj) return "";
    if (typeof tableObj.tableName === "string") return tableObj.tableName;
    const syms = Object.getOwnPropertySymbols(tableObj);
    for (const sym of syms) {
      if (sym.toString() === "Symbol(drizzle:Name)" || sym.toString() === "Symbol(drizzle:BaseName)") {
        return tableObj[sym];
      }
    }
    return tableObj.tableName || "";
  }

  function dbToJsField(dbField: string): string {
    if (dbField === "user_id") return "userId";
    if (dbField === "track_id") return "trackId";
    if (dbField === "playlist_id") return "playlistId";
    return dbField;
  }

  function parseCondition(condition: any) {
    if (!condition || !condition.queryChunks) return null;
    const chunks = condition.queryChunks;
    const fields: string[] = [];
    const params: any[] = [];
    
    for (const chunk of chunks) {
      if (chunk && chunk.name && typeof chunk.name === "string") {
        fields.push(chunk.name);
      } else if (chunk && chunk.value !== undefined && chunk.constructor.name === "Param") {
        params.push(chunk.value);
      }
    }
    
    if (fields.length === 1 && params.length === 1) {
      return { field: fields[0], val: params[0] };
    }
    return { fields, params };
  }
  
  db = {
    select: (fields?: any) => {
      let table: any[] = [];
      let queryResult = {
        from: (tableObj: any) => {
          const tableName = getTableName(tableObj);
          if (tableName === "favorites") {
            table = [...mockFavorites];
          } else if (tableName === "playlists") {
            table = [...mockPlaylists];
          } else if (tableName === "playlist_tracks") {
            table = [...mockPlaylistTracks];
          }
          
          let chain = {
            where: (condition: any) => {
              const parsed = parseCondition(condition);
              if (parsed) {
                const { field, val, fields, params } = parsed as any;
                if (field) {
                  const jsField = dbToJsField(field);
                  table = table.filter(x => String(x[jsField]) === String(val));
                } else if (fields && params) {
                  for (let i = 0; i < fields.length; i++) {
                    const jsField = dbToJsField(fields[i]);
                    const val = params[i];
                    table = table.filter(x => String(x[jsField]) === String(val));
                  }
                }
              }
              return chain;
            },
            limit: (n: number) => {
              table = table.slice(0, n);
              return chain;
            },
            orderBy: (col: any) => {
              return table;
            },
            then: (resolve: any) => {
              if (fields && fields.trackId) {
                return resolve(table.map(x => ({ trackId: x.trackId })));
              }
              if (fields && fields.count) {
                return resolve([{ count: table.length }]);
              }
              return resolve(table);
            },
          };
          return Object.assign(chain, {
            then: (resolve: any) => {
              if (fields && fields.trackId) {
                return resolve(table.map(x => ({ trackId: x.trackId })));
              }
              if (fields && fields.count) {
                return resolve([{ count: table.length }]);
              }
              return resolve(table);
            }
          });
        }
      };
      return queryResult;
    },
    insert: (tableObj: any) => {
      return {
        values: (val: any) => {
          let rows = Array.isArray(val) ? val : [val];
          let inserted: any[] = [];
          const tableName = getTableName(tableObj);
          if (tableName === "favorites") {
            rows.forEach(r => {
              if (!mockFavorites.some(f => f.trackId === r.trackId && f.userId === r.userId)) {
                const entry = { ...r, addedAt: new Date() };
                mockFavorites.push(entry);
                inserted.push(entry);
              }
            });
          } else if (tableName === "playlists") {
            rows.forEach(r => {
              const entry = { ...r, id: nextPlaylistId++, createdAt: new Date() };
              mockPlaylists.push(entry);
              inserted.push(entry);
            });
          } else if (tableName === "playlist_tracks") {
            rows.forEach(r => {
              const entry = { ...r, id: nextPlaylistTrackId++, addedAt: new Date() };
              mockPlaylistTracks.push(entry);
              inserted.push(entry);
            });
          }
          
          let chain = {
            onConflictDoNothing: () => chain,
            returning: () => {
              return {
                then: (resolve: any) => resolve(inserted)
              };
            },
            then: (resolve: any) => resolve(inserted),
          };
          return chain;
        }
      };
    },
    update: (tableObj: any) => {
      return {
        set: (values: any) => {
          return {
            where: (condition: any) => {
              const parsed = parseCondition(condition);
              let updated: any[] = [];
              if (parsed) {
                const tableName = getTableName(tableObj);
                const { field, val, fields, params } = parsed as any;
                
                const matchesCondition = (x: any) => {
                  if (field) {
                    const jsField = dbToJsField(field);
                    return String(x[jsField]) === String(val);
                  } else if (fields && params) {
                    for (let i = 0; i < fields.length; i++) {
                      const jsField = dbToJsField(fields[i]);
                      if (String(x[jsField]) !== String(params[i])) {
                        return false;
                      }
                    }
                    return true;
                  }
                  return false;
                };

                if (tableName === "playlists") {
                  mockPlaylists = mockPlaylists.map(p => {
                    if (matchesCondition(p)) {
                      const entry = { ...p, ...values };
                      updated.push(entry);
                      return entry;
                    }
                    return p;
                  });
                }
              }
              return {
                returning: () => ({
                  then: (resolve: any) => resolve(updated)
                }),
                then: (resolve: any) => resolve(updated)
              };
            }
          };
        }
      };
    },
    delete: (tableObj: any) => {
      return {
        where: (condition: any) => {
          const parsed = parseCondition(condition);
          if (parsed) {
            const tableName = getTableName(tableObj);
            const { field, val, fields, params } = parsed as any;
            
            const matchesCondition = (x: any) => {
              if (field) {
                const jsField = dbToJsField(field);
                return String(x[jsField]) === String(val);
              } else if (fields && params) {
                for (let i = 0; i < fields.length; i++) {
                  const jsField = dbToJsField(fields[i]);
                  if (String(x[jsField]) !== String(params[i])) {
                    return false;
                  }
                }
                return true;
              }
              return false;
            };

            if (tableName === "favorites") {
              mockFavorites = mockFavorites.filter(x => !matchesCondition(x));
            } else if (tableName === "playlists") {
              const deletedIds = mockPlaylists.filter(matchesCondition).map(x => x.id);
              mockPlaylists = mockPlaylists.filter(x => !matchesCondition(x));
              if (deletedIds.length > 0) {
                mockPlaylistTracks = mockPlaylistTracks.filter(x => !deletedIds.includes(x.playlistId));
              }
            } else if (tableName === "playlist_tracks") {
              mockPlaylistTracks = mockPlaylistTracks.filter(x => !matchesCondition(x));
            }
          }
          return {
            then: (resolve: any) => resolve(),
          };
        }
      };
    }
  } as any as DrizzleDb;
}

export * from "./schema";
export type { Playlist, PlaylistTrack, InsertPlaylist, InsertPlaylistTrack } from "./schema";
