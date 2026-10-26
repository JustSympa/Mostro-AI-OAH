"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Register is now handled by the unified auth page at /login
// This redirect ensures backward compatibility for any direct /register links
export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login?tab=signup");
  }, [router]);

  return null;
}
