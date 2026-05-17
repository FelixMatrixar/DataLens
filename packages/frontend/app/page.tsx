import { auth } from "@clerk/nextjs/server";
import LandingPage from "@/components/landing/LandingPage";

export default async function Page() {
  const { userId } = await auth();
  return <LandingPage isSignedIn={!!userId} />;
}
