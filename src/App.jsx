import React, { useState, useEffect } from 'react';
import { UploadView } from './components/UploadView';
import { DownloadView } from './components/DownloadView';
import { Ghost } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState('upload');
  const [fileId, setFileId] = useState(null);

  useEffect(() => {
    const handleRouteChange = () => {
      const path = window.location.pathname;
      // We expect UUIDs but capture everything after /d/ so DownloadView can show proper errors.
      const match = path.match(/^\/d\/([^/#?]+)/);
      if (match) {
        setFileId(match[1]);
        setCurrentView('download');
      } else {
        setFileId(null);
        setCurrentView('upload');
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    handleRouteChange(); // Trigger on initial load

    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  return (
    <div className="app-container">
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Ghost size={40} color="var(--accent)" />
          GhostSend
        </h1>
        <p className="subtitle">Secure, Zero-Knowledge File Sharing</p>
      </div>

      {currentView === 'upload' ? <UploadView /> : <DownloadView fileId={fileId} />}
    </div>
  );
}

export default App;
