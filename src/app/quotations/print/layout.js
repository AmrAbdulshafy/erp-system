// This is a standalone layout for the quotation print page.
// It intentionally does NOT include ClientLayout (sidebar/topbar)
// so the print view is clean and full-width.
export default function PrintLayout({ children }) {
  return <>{children}</>;
}
