import { NextResponse } from "next/server";
import { getBrand, updateBrand } from "@/lib/brand";
import { dataErrorResponse } from "@/lib/api-errors";

export async function GET() {
  try {
    const brand = await getBrand();
    return NextResponse.json(brand);
  } catch (err) {
    const dataError = dataErrorResponse(err);
    if (dataError) return dataError;
    throw err;
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const updated = await updateBrand(body);
    return NextResponse.json(updated);
  } catch (err) {
    const dataError = dataErrorResponse(err);
    if (dataError) return dataError;
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
