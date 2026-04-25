import { GymreapersProvider } from './_lib/GymreapersProvider';

export default function GymreapersLayout({ children }: { children: React.ReactNode }) {
  // Global root layout already provides the dark gr-bg. We just need the
  // data provider here. SubNav is removed — main nav covers all sub-pages.
  return <GymreapersProvider>{children}</GymreapersProvider>;
}
