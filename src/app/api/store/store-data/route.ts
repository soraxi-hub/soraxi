import { NextRequest, NextResponse } from "next/server";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  const store = getStoreFromCookie();

  if (!store) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ store });
}
