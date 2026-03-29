import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { LangBadge } from "./LangBadge";
import { useState } from "react";
import { DocumentModal } from "./DocumentModal";

interface FileTagProps {
  filename: string;
  langBadge?: string;
  className?: string;
}

export function FileTag({ filename, langBadge, className }: FileTagProps) {
  const [modalOpen, setModalOpen] = useState(false);

  // Truncate filename intelligently
  let display = filename;
  if (filename.length > 25) {
    const parts = filename.split('.');
    const ext = parts.length > 1 ? `.${parts.pop()}` : '';
    const base = parts.join('.');
    display = `${base.substring(0, 15)}...${base.substring(base.length - 4)}${ext}`;
  }

  return (
    <>
      <div 
        onClick={() => setModalOpen(true)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#111] hover:bg-[#1A1A1A] border border-border hover:border-accent-primary cursor-pointer text-sm text-text-secondary w-full transition-all group",
          className
        )}
      >
        <FileText size={14} className="text-text-muted flex-shrink-0 group-hover:text-accent-primary transition-colors" />
        <span className="font-mono truncate flex-1 group-hover:text-white transition-colors" title={filename}>{display}</span>
        {langBadge && <LangBadge lang={langBadge} />}
      </div>
      
      {modalOpen && (
        <DocumentModal 
          filename={filename} 
          onClose={() => setModalOpen(false)} 
        />
      )}
    </>
  );
}
