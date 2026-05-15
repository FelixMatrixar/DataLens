import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
      <SignIn
        afterSignInUrl="/dashboard"
        afterSignUpUrl="/dashboard"
        signUpUrl="/login"
        appearance={{ elements: { rootBox: "mx-auto" } }}
      />
    </div>
  );
}
