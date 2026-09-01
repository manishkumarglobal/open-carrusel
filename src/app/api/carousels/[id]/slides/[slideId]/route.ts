import { NextResponse } from "next/server";
import { updateSlide, deleteSlide } from "@/lib/carousels";
import { dataErrorResponse } from "@/lib/api-errors";
import { pickSlideUpdate } from "@/lib/api-input";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  const { id, slideId } = await params;
  try {
    const body = await request.json();
    // Only html and notes. id, order and previousVersions (the undo history)
    // are server-owned and are never taken from the request.
    const slide = await updateSlide(id, slideId, pickSlideUpdate(body));
    if (!slide) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(slide);
  } catch (err) {
    const dataError = dataErrorResponse(err);
    if (dataError) return dataError;
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  const { id, slideId } = await params;
  const deleted = await deleteSlide(id, slideId);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
