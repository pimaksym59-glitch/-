/** Public route-group layout — no app shell; centered marketing/auth surfaces. */
export default function PublicLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-6 text-primary">{children}</div>
  );
}
