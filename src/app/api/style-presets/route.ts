import { NextResponse } from "next/server";
import { listPresets, createPreset } from "@/lib/style-presets";
import { dataErrorResponse } from "@/lib/api-errors";

export async function GET() {
  const presets = await listPresets();
  return NextResponse.json({ presets });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, brand, designRules, exampleSlideHtml, aspectRatio, tags } = body;

    if (!name || !designRules) {
      return NextResponse.json(
        { error: "name and designRules are required" },
        { status: 400 }
      );
    }

    const preset = await createPreset({
      name,
      description: description || "",
      brand: brand || {},
      designRules,
      exampleSlideHtml: exampleSlideHtml || "",
      aspectRatio: aspectRatio || "4:5",
      tags: tags || [],
    });

    return NextResponse.json(preset, { status: 201 });
  } catch (err) {
    const dataError = dataErrorResponse(err);
    if (dataError) return dataError;
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
