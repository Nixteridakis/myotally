import { NextResponse } from "next/server";
import { getNotionData } from "@/lib/notion";

// Reads live env + hits Notion, so never statically cache this route.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  try {
    const data = await getNotionData(force);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
