"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RegisterRedirector() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const role = searchParams.get("role") || sessionStorage.getItem("auth_role") || "tenant";
    const redirect = searchParams.get("redirect");
    const query = new URLSearchParams();
    if (redirect) {
      query.set("redirect", redirect);
    }
    const queryString = query.toString() ? `?${query.toString()}` : "";
    router.replace(`/auth/register/${role}${queryString}`);
  }, [router, searchParams]);

  return (
    <div className="flex-grow flex items-center justify-center min-h-[600px] bg-[#f8f9ff]">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-[3px] border-[#002046]/15 border-t-[#002046] animate-spin" />
        <div className="absolute w-10 h-10 rounded-full border-[3px] border-[#aec7f7]/20 border-b-[#aec7f7] animate-spin [animation-direction:reverse] [animation-duration:1s]" />
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterRedirector />
    </Suspense>
  );
}
