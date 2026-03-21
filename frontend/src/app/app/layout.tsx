import { Sidebar } from '@/components/layout/Sidebar';
import { CelestialSphere } from '@/components/ui/celestial-sphere';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-base">
      <Sidebar />
      <main className="flex-1 overflow-auto relative bg-[#050505]">
        {/* Animated WebGL Background */}
        <CelestialSphere 
          className="absolute inset-0 z-0 mix-blend-screen pointer-events-none opacity-60" 
          hue={38} 
          zoom={1.5} 
          particleSize={4.0} 
        />
        
        {/* Darkening overlay so text is readable */}
        <div className="absolute inset-0 bg-base/70 z-0 pointer-events-none backdrop-blur-sm" />
        
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
