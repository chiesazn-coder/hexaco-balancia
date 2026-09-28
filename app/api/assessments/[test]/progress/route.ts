import { authenticate, failure, json, readBody } from "@/lib/server/assessment-http";
import { adminDb } from "@/lib/server/firebase-admin";
import { progressRef, saveDraft } from "@/lib/server/assessment-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: { test: string } }) {
  try {
    const { identity, test } = await authenticate(request, params.test);
    const draft = (await progressRef(adminDb(), identity.uid, test).get()).data();
    return json({ revision: draft?.revision ?? 0, data: draft ? JSON.parse(draft.payload) : null });
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request, { params }: { params: { test: string } }) {
  try {
    const { identity, test } = await authenticate(request, params.test);
    return json(await saveDraft(adminDb(), identity.uid, test, await readBody(request)));
  } catch (error) { return failure(error); }
}
