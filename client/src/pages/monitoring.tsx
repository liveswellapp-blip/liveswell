import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MonitoringDashboard from "@/components/MonitoringDashboard";
import AdminLogin from "@/components/AdminLogin";
import { Activity, Shield } from "lucide-react";
import { useState } from "react";

interface AdminStatus {
  authenticated: boolean;
  username?: string;
  loginTime?: number;
}

export default function Monitoring() {
  const [loginRefresh, setLoginRefresh] = useState(0);
  
  const { data: adminStatus, isLoading } = useQuery<AdminStatus>({
    queryKey: ['/api/admin/status', loginRefresh],
    retry: false
  });

  const handleLoginSuccess = () => {
    setLoginRefresh(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Checking access permissions...</p>
        </div>
      </div>
    );
  }

  if (!adminStatus?.authenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
              <Activity className="w-4 h-4" />
              System Monitoring
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Application Health Dashboard
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Real-time monitoring of system health, performance metrics, and API usage statistics.
            </p>
          </div>

          <MonitoringDashboard />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}