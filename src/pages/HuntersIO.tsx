import { DashboardLayout } from "@/components/ui/dashboard-layout";
import { HuntersIOTab } from "@/components/HuntersIOTab";

export default function HuntersIO() {
  return (
    <DashboardLayout userType="admin" darkMode>
      <HuntersIOTab />
    </DashboardLayout>
  );
}
