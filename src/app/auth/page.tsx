import { AuthForm } from '@/components/auth-form';
export default function Page() {
  return (
    <div className="page-container narrow">
      <span className="eyebrow">A PLACE TO KEEP GROWING</span>
      <h1>Your journey starts here.</h1>
      <AuthForm />
    </div>
  );
}
