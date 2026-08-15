import { GET as getMe } from "@/app/api/me/route";

export const dynamic = "force-dynamic";

export async function GET() {
  return getMe();
}
