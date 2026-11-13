import { AuthGuard } from '@/components/AuthGuard';
import { BottomNav } from '@/components/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-1 flex-col px-4 pb-24 pt-6">
        {children}
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
