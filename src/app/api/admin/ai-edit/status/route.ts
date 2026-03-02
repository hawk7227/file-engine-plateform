import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "disabled",
    message: "Build status monitoring not yet configured",
    jobId: null,
    state: null,
    progress: 0,
    result: null,
    failedReason: null,
  })
}
