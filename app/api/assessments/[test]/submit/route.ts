import { authenticate, failure, json, readBody } from "@/lib/server/assessment-http";
import { adminDb } from "@/lib/server/firebase-admin";
import { submitAssessment } from "@/lib/server/assessment-store";

export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: { test: string } }) {
  try {
    const { identity, test } = await authenticate(request, params.test);
    return json(await submitAssessment(adminDb(), identity.uid, test, await readBody(request)));
  } catch (error) { return failure(error); }
}
