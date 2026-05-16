export default function GymreapersLayout({ children }: { children: React.ReactNode }) {
  // GymreapersProvider is now wrapped at the app root so /today and the new
  // /for-marketing /for-product /data-explorer routes can use useGymreapersData.
  // This layout is intentionally pass-through.
  return <>{children}</>;
}
