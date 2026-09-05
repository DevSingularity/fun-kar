import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <>
      <AppRoutes />
      <Toaster
        position="top-right"
        gutter={10}
        containerStyle={{ top: 20, right: 24 }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '600',
            padding: '12px 16px',
            boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.12), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
            border: '1px solid #cbd5e1',
            letterSpacing: '-0.01em',
          },
          success: {
            duration: 3500,
            iconTheme: {
              primary: '#059669',
              secondary: '#ffffff',
            },
            style: {
              borderLeft: '4px solid #059669',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#e11d48',
              secondary: '#ffffff',
            },
            style: {
              borderLeft: '4px solid #e11d48',
            },
          },
          loading: {
            iconTheme: {
              primary: '#714b67',
              secondary: '#ffffff',
            },
            style: {
              borderLeft: '4px solid #714b67',
            },
          },
        }}
      />
    </>
  );
}

export default App;
