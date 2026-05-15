"use client";
import { useClerk } from "@clerk/nextjs";

export default function LogoutButton() {
  const { signOut } = useClerk();
  return (
    <button
      onClick={() => signOut({ redirectUrl: "/" })}
      className="text-sm text-[#A0A0A0] hover:text-white transition"
    >
      Sign out
    </button>
  );
}
