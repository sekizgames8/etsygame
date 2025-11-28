import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const GlassCard = ({ children, className, hoverEffect = false }: GlassCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "glass rounded-xl p-6 transition-all duration-300",
        hoverEffect && "glass-hover cursor-pointer hover:-translate-y-1",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

