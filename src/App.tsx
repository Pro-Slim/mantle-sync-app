import Dashboard from './pages/Dashboard';
import { AuthProvider } from './contexts/AuthContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <Dashboard />
      </div>
    </AuthProvider>
  );
}

export default App;
