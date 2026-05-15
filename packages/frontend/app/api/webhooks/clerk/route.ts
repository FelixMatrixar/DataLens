import { Webhook } from "svix";
import { supabaseAdmin } from "@/lib/supabase/server";

const ALLOWED_DOMAINS = [
  "gmail.com", "outlook.com", "hotmail.com",
  "yahoo.com", "ymail.com",
];

export async function POST(req: Request) {
  const body = await req.text();
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

  let evt: any;
  try {
    evt = wh.verify(body, Object.fromEntries(req.headers)) as any;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (evt.type === "user.created") {
    const email: string = evt.data.email_addresses?.[0]?.email_address ?? "";
    const domain = email.split("@")[1]?.toLowerCase() ?? "";

    if (!ALLOWED_DOMAINS.includes(domain)) {
      const { clerkClient } = await import("@clerk/nextjs/server");
      await clerkClient.users.deleteUser(evt.data.id);
      return new Response("Domain not allowed", { status: 403 });
    }

    await supabaseAdmin
      .from("profiles")
      .insert({ clerk_user_id: evt.data.id, email });
  }

  return new Response("OK");
}
