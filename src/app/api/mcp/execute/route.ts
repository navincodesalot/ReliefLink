import { NextResponse } from "next/server";
import { z } from "zod";

import { MCP_TOOL_NAMES } from "@/lib/ai/contracts";
import { executeMcpTool } from "@/lib/ai/mcp-tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  tool: z.enum(MCP_TOOL_NAMES),
  args: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await executeMcpTool(parsed.data.tool, parsed.data.args);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
