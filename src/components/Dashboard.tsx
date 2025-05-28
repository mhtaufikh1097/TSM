// components/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import AppLayout from './layout/AppLayout';
import DashboardHome from './dashboard/DashboardHome';
import InspectionForm from './dashboard/InspectionForm';
import HistoryView from './dashboard/HistoryView';
import SettingsView from './dashboard/SettingsView';
import AllInspectionsView from './dashboard/AllInspectionsView';
import InspectionDetailView from './dashboard/InspectionDetailView';
import { useAuth } from '../lib/auth-context';
import QcDashboard from './dashboard/QcDashboard';
import PmDashboard from './dashboard/PmDashboard';
import { useRouter } from 'next/router';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedInspectionId, setSelectedInspectionId] = useState<number | null>(null);
  const {isAuthenticated, loading, isQc, isPm } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, loading, router]);

  // Render the appropriate component based on the active tab
  const renderContent = () => {
    // Handle inspection detail view
    if (selectedInspectionId) {
      return (
        <InspectionDetailView 
          inspectionId={selectedInspectionId} 
          onBack={() => setSelectedInspectionId(null)} 
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome />;
      case 'inspections':
         return <InspectionForm />;
      case 'all-inspections':
        return <AllInspectionsView onViewInspection={setSelectedInspectionId} />;
      case 'history':
        return <HistoryView />;
      case 'settings':
        return <SettingsView />;
    }

    if(isQc) {
        switch (activeTab) {
          case 'reviews':
          
          return <QcDashboard />; 
      }
    }

    if(isPm) {
        switch (activeTab) {
          case 'projects':
            return <PmDashboard />; 
      }
    }

     return <DashboardHome />;
  };

  // Show loading or redirect if not authenticated
  if (loading || !isAuthenticated) {
    return null;
  }

  return (
    <AppLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </AppLayout>
  );
};

export default Dashboard;