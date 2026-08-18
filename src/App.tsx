import { useState } from 'react';
import { StoreProvider } from '@/store/StoreContext';
import { Layout, type Page } from '@/components/Layout';
import { ToastContainer } from '@/components/Toast';
import { Dashboard } from '@/pages/Dashboard';
import { InventoryPage } from '@/pages/Inventory';
import { OrdersPage } from '@/pages/Orders';
import { AllocationPage } from '@/pages/Allocation';
import { PickingPage } from '@/pages/Picking';
import { PackingPage } from '@/pages/Packing';
import { DispatchPage } from '@/pages/Dispatch';
import { ExceptionsPage } from '@/pages/Exceptions';
import { AnalyticsPage } from '@/pages/Analytics';
import { CopilotPage } from '@/pages/Copilot';
import { AuditPage } from '@/pages/Audit';
import { SettingsPage } from '@/pages/Settings';

function App() {
  const [page, setPage] = useState<Page>('dashboard');

  return (
    <StoreProvider>
      <Layout page={page} setPage={setPage}>
        {page === 'dashboard' && <Dashboard setPage={setPage} />}
        {page === 'inventory' && <InventoryPage />}
        {page === 'orders' && <OrdersPage setPage={setPage} />}
        {page === 'allocation' && <AllocationPage />}
        {page === 'picking' && <PickingPage />}
        {page === 'packing' && <PackingPage />}
        {page === 'dispatch' && <DispatchPage />}
        {page === 'exceptions' && <ExceptionsPage />}
        {page === 'analytics' && <AnalyticsPage />}
        {page === 'copilot' && <CopilotPage />}
        {page === 'audit' && <AuditPage />}
        {page === 'settings' && <SettingsPage />}
      </Layout>
      <ToastContainer />
    </StoreProvider>
  );
}

export default App;
