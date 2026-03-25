import './App.css';
import { AppRoutes } from './components/AppRoutes';
import { AppLoadingScreen } from './components/AppLoadingScreen';
import { useNotification } from './context/NotificationContext';
import { useContractsLoaded } from './hooks/useContractsLoaded';

function App() {
  const { notify } = useNotification();
  const { contractsLoaded } = useContractsLoaded({ notify });

  if (!contractsLoaded) {
    return <AppLoadingScreen />;
  }

  return <AppRoutes />;
}

export default App;
