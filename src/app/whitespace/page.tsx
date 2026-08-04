'use client';

// Retired 2026-08-03 (page audit) — superseded. Redirects to /gymreapers/amazon so no
// bookmark 404s. Original preserved in ./page.legacy.bak.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RetiredRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/gymreapers/amazon'); }, [router]);
  return <p className="text-sm text-gr-subtle p-8">This page has moved. Redirecting…</p>;
}
