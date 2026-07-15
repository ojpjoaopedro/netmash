'use client';

import { useRouter } from 'next/navigation';
import AulaDeck from './AulaDeck';

export default function AulaComercialPage() {
  const router = useRouter();
  return <AulaDeck onClose={() => router.push('/')} />;
}
