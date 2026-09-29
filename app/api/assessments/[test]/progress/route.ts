import { authenticate, bodyLimit, failure, json, readBody, routeContext } from "@/lib/server/assessment-http";
import { adminDb } from "@/lib/server/firebase-admin";
import { progressRef, saveDraft } from "@/lib/server/assessment-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: { test: string } }) {
  const context = routeContext("progress", request, params.test);
  try {
    const { identity, test } = await authenticate(request, params.test);
    context.uid = identity.uid;
    const draft = (await progressRef(adminDb(), identity.uid, test).get()).data();
    return json({ revision: draft?.revision ?? 0, data: draft ? JSON.parse(draft.payload) : null });
  } catch (error) { return failure(error, context); }
}
export async function PUT(request: Request, { params }: { params: { test: string } }) {
  const context = routeContext("progress", request, params.test);
  try {
    const { identity, test } = await authenticate(request, params.test);
    context.uid = identity.uid;
    return json(await saveDraft(adminDb(), identity.uid, test, await readBody(request, bodyLimit(test))));
  } catch (error) { return failure(error, context); }
}
