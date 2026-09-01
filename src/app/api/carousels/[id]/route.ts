import { NextResponse } from "next/server";
import { getCarousel, updateCarousel, deleteCarousel } from "@/lib/carousels";
import { dataErrorResponse } from "@/lib/api-errors";
import { pickCarouselUpdate } from "@/lib/api-input";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const carousel = await getCarousel(id);
    if (!carousel) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(carousel);
  } catch (err) {
    const dataError = dataErrorResponse(err);
    if (dataError) return dataError;
    throw err;
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    // Only the fields this endpoint defines as mutable. Everything else,
    // including id, slides, referenceImages, isTemplate and the timestamps, is
    // server-owned and is never taken from the request.
    const updated = await updateCarousel(id, pickCarouselUpdate(body));
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    const dataError = dataErrorResponse(err);
    if (dataError) return dataError;
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await deleteCarousel(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
