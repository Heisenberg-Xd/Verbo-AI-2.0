import React, { useState } from 'react';
import LandingPage from '@/components/LandingPage';
import UploadPage from '@/components/UploadPage';
import './index.css';

function App() {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white">
      {!showUpload ? (
        <LandingPage onGetStarted={() => setShowUpload(true)} />
      ) : (
        <UploadPage />
      )}
    </div>
  );
}

export default App;