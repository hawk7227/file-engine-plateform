import { NextResponse } from "next/server";
// import { getBuildStatus } ... whatever you use

export async function GET() {
  const status = await getBuildStatus(); // returns BuildStatus

  // ✅ handle the union's "disabled" variant
  if (status.status === "disabled") {
    return NextResponse.json({
      status: "disabled",
      message: status.message,
      jobId: null,
      state: null,
      progress: 0,
      result: null,
      failedReason: null,
    });
  }

  // ✅ all fields are now safe to access
  return NextResponse.json({
    status: "enabled",
    jobId: status.id,
    state: status.state,
    progress: status.progress,
    result: status.result ?? null,
    failedReason: status.failedReason ?? null,
  });
}
