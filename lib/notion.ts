import { Client, isFullPage } from "@notionhq/client";
import type {
  PageObjectResponse,
  QueryDatabaseParameters,
} from "@notionhq/client/build/src/api-endpoints";
import type { Exercise, MuscleGroup, NotionData } from "./types";

/**
 * Property names as they appear in your Notion databases. If you rename a
 * column in Notion, update it here to match.
 */
const PROPS = {
  exerciseTitle: "Title",
  primary: "primary muscle group",
  secondary: "secondary muscle group",
  tertiary: "tertiary muscle group",
  movement: "Movement",
  mechanics: "Mechanics",
  muscleName: "Name",
} as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.local.example to .env.local and fill it in.`
    );
  }
  return value;
}

function getClient(): Client {
  return new Client({ auth: requireEnv("NOTION_TOKEN") });
}

// --- property extractors -------------------------------------------------

type Props = PageObjectResponse["properties"];

function getTitle(props: Props, key: string): string {
  const p = props[key];
  if (p?.type === "title") return p.title.map((t) => t.plain_text).join("");
  return "";
}

function getRelationIds(props: Props, key: string): string[] {
  const p = props[key];
  if (p?.type === "relation") return p.relation.map((r) => r.id);
  return [];
}

function getSelect(props: Props, key: string): string | null {
  const p = props[key];
  if (p?.type === "select") return p.select?.name ?? null;
  if (p?.type === "status") return p.status?.name ?? null;
  return null;
}

// --- querying ------------------------------------------------------------

async function queryAll(
  notion: Client,
  databaseId: string
): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const params: QueryDatabaseParameters = {
      database_id: databaseId,
      page_size: 100,
      start_cursor: cursor,
    };
    const res = await notion.databases.query(params);
    for (const r of res.results) {
      if (isFullPage(r)) pages.push(r);
    }
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  return pages;
}

async function fetchFromNotion(): Promise<NotionData> {
  const notion = getClient();
  const exercisesDbId = requireEnv("NOTION_EXERCISES_DB_ID");
  const musclesDbId = requireEnv("NOTION_MUSCLES_DB_ID");

  const [musclePages, exercisePages] = await Promise.all([
    queryAll(notion, musclesDbId),
    queryAll(notion, exercisesDbId),
  ]);

  const muscles: MuscleGroup[] = musclePages.map((p) => ({
    id: p.id,
    name: getTitle(p.properties, PROPS.muscleName),
  }));
  const muscleName = new Map(muscles.map((m) => [m.id, m.name]));
  const resolve = (ids: string[]) =>
    ids.map((id) => muscleName.get(id)).filter((n): n is string => Boolean(n));

  const exercises: Exercise[] = exercisePages.map((p) => ({
    id: p.id,
    name: getTitle(p.properties, PROPS.exerciseTitle),
    primary: resolve(getRelationIds(p.properties, PROPS.primary)),
    secondary: resolve(getRelationIds(p.properties, PROPS.secondary)),
    tertiary: resolve(getRelationIds(p.properties, PROPS.tertiary)),
    movement: getSelect(p.properties, PROPS.movement),
    mechanics: getSelect(p.properties, PROPS.mechanics),
  }));

  exercises.sort((a, b) => a.name.localeCompare(b.name));
  muscles.sort((a, b) => a.name.localeCompare(b.name));

  return { exercises, muscles, fetchedAt: new Date().toISOString() };
}

// --- in-memory cache -----------------------------------------------------

const TTL_MS = 5 * 60 * 1000;
let cache: { data: NotionData; ts: number } | null = null;

export async function getNotionData(force = false): Promise<NotionData> {
  if (!force && cache && Date.now() - cache.ts < TTL_MS) {
    return cache.data;
  }
  const data = await fetchFromNotion();
  cache = { data, ts: Date.now() };
  return data;
}
