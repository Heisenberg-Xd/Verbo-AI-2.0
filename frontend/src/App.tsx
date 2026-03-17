import React, { useState } from "react";
import LandingPage from "@/components/LandingPage";
import UploadPage from "@/components/UploadPage";
import IntelligenceDashboard from "@/pages/IntelligenceDashboard";
import "./index.css";

type Stage = "landing" | "upload" | "dashboard";

function App() {
  const [stage, setStage] = useState<Stage>("landing");

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* Landing Page */}
      {stage === "landing" && (
        <LandingPage onGetStarted={() => setStage("upload")} />
      )}

      {/* Upload Page */}
      {stage === "upload" && (
        <UploadPage onComplete={() => setStage("dashboard")} />
      )}

      {/* Intelligence Dashboard */}
      {stage === "dashboard" && (
        <IntelligenceDashboard />
      )}

    </div>
  );
}

export default App;