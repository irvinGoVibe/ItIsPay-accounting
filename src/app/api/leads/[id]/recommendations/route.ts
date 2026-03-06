import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  generateCompanyProfile,
  generateSalesScript,
  generateRecommendations,
} from "@/lib/ai/recommendations";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const type = body.type || "next_steps";
  const lang = body.lang || "en";

  try {
    let content: string;

    switch (type) {
      case "company_profile":
        content = await generateCompanyProfile(id, session.user.id, lang);
        break;
      case "sales_script":
        content = await generateSalesScript(id, session.user.id, lang);
        break;
      case "next_steps":
      default:
        content = await generateRecommendations(id, session.user.id, lang);
        break;
    }

    return NextResponse.json({ content, type });
  } catch (error) {
    console.error(`Recommendations (${type}) generation error:`, error);
    return NextResponse.json(
      { error: `Failed to generate ${type}` },
      { status: 500 }
    );
  }
}
