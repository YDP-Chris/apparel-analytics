import { GymreapersProvider } from './_lib/GymreapersProvider';
import SubNav from './_lib/SubNav';

export default function GymreapersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gr-bg text-gr-text -mx-4 sm:-mx-6 lg:-mx-8 -my-8 px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <GymreapersProvider>
          <SubNav />
          {children}
        </GymreapersProvider>
      </div>
    </div>
  );
}
