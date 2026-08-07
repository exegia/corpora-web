/**
 * Wraps a row's single control: without this the grid stretches the control
 * to the (taller) label column's height, leaving the text top-aligned in an
 * oversized box.
 */
export default function RowControl({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col justify-center">{children}</div>
}
