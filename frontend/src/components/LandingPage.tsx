import React from 'react';
import Hero from "@/components/ui/animated-shader-hero";

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="w-full">
      <Hero
        trustBadge={{
          text: "VerboAI - Intelligent document exploration platform.",
          icons: ["✨"]
        }}
        headline={{
          line1: "Unlock Intelligence",
          line2: "From Your Documents"
        }}
        subtitle="Transform massive document collections into actionable insights with AI-powered analysis, knowledge graphs, and intelligent exploration — built for the next generation of research, investigation, and decision-making."
        buttons={{
          primary: {
            text: "Get Started",
            onClick: onGetStarted
          },
          secondary: {
            text: "Explore Features",
            onClick: () => {
                const el = document.getElementById('features');
                el?.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }}
      />
    </div>
  );
};

export default LandingPage;
