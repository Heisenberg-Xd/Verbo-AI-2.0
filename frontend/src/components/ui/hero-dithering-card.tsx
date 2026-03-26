"use client"

import { ArrowRight } from "lucide-react"
import { useState, Suspense, lazy } from "react"
import Link from "next/link"

const Dithering = lazy(() => 
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
)

export function CTASection() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <section className="py-12 w-full flex justify-center items-center px-4 md:px-6">
      <div 
        className="w-full max-w-7xl relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative overflow-hidden rounded-[48px] border border-border bg-card shadow-sm min-h-[600px] md:min-h-[600px] flex flex-col items-center justify-center duration-500">
             <Suspense fallback={<div className="absolute inset-0 bg-muted/20" />}>
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen">
              <Dithering
                colorBack="#00000000" // Transparent
                colorFront="#F59E0B"  // Mapped to our Theme's Amber Accent
                shape="warp"
                type="4x4"
                speed={isHovered ? 0.6 : 0.2}
                className="size-full"
                minPixelRatio={1}
              />
            </div>
          </Suspense>

          <div className="relative z-10 px-6 max-w-4xl mx-auto text-center flex flex-col items-center">
            
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-4 py-1.5 text-sm font-medium text-accent-primary backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-primary"></span>
              </span>
              Verbo AI V2.0
            </div>

            {/* Headline */}
            <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight text-foreground mb-8 leading-[1.05]">
              Document Intelligence, <br />
              <span className="text-foreground/80">Untangled.</span>
            </h2>
            
            {/* Description */}
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mb-12 leading-relaxed font-sans">
              Join elite organizations using the only AI that automatically clusters, translates, maps entities, and scales unstructured data safely.
            </p>

            {/* Button */}
            <Link href="/workspaces" className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full bg-accent-primary px-12 text-base font-bold text-black transition-all duration-300 hover-glow-amber hover:bg-accent-primary/90 hover:scale-105 active:scale-95 shadow-lg shadow-accent-primary/20">
              <span className="relative z-10 font-bold tracking-wide">Initialize Workspace</span>
              <ArrowRight className="h-5 w-5 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
