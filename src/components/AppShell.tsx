import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

type Employee = { id: string; name: string; role: string };

export function AppShell({
  employees,
  children,
}: {
  employees: Employee[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar employees={employees} />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
