import { LoginCard } from '../modules/auth/LoginCard';

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.1),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4">
      <LoginCard />
    </div>
  );
}
