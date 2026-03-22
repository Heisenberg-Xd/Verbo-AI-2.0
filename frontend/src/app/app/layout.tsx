import { Sidebar } from '@/components/layout/Sidebar';
import { CelestialSphere } from '@/components/ui/celestial-sphere';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-base relative">
      {/* Animated WebGL Background - Moved to root for global glassmorphism effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <CelestialSphere 
          className="w-full h-full mix-blend-screen opacity-60" 
          hue={38} 
          zoom={1.5} 
          particleSize={4.0} 
        />
        {/* Darkening overlay so text is readable */}
        <div className="absolute inset-0 bg-base/70 backdrop-blur-[2px]" />
      </div>

      <Sidebar />
      
      <main className="flex-1 overflow-auto relative z-10 bg-transparent">
        <div className="w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
