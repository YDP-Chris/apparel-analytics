import { GymreapersProvider } from './_lib/GymreapersProvider';
import SubNav from './_lib/SubNav';

export default function GymreapersLayout({ children }: { children: React.ReactNode }) {
  return (
    <GymreapersProvider>
      <SubNav />
      {children}
    </GymreapersProvider>
  );
}
