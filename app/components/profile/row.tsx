/** A divided row: label left, control right. */
export default function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-3 border-b py-4 last:border-b-0 sm:grid-cols-2 sm:gap-8 sm:py-5">
      {children}
    </div>
  )
}
