import { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down";
}

const StatCard = ({ icon: Icon, label, value, change, trend }: StatCardProps) => {
  const [displayed, setDisplayed] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  // Animate numeric values
  useEffect(() => {
    const numericMatch = String(value).match(/[\d,]+/);
    if (!numericMatch) {
      setDisplayed(value);
      return;
    }
    const target = parseInt(numericMatch[0].replace(/,/g, ""), 10);
    const prefix = String(value).slice(0, String(value).indexOf(numericMatch[0]));
    const suffix = String(value).slice(String(value).indexOf(numericMatch[0]) + numericMatch[0].length);

    let start = 0;
    const duration = 1200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.floor(target * eased);
      setDisplayed(`${prefix}${start.toLocaleString()}${suffix}`);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <div className="glass card-lift rounded-lg p-4 group neon-border-primary cursor-default">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors group-hover:shadow-glow-primary">
            <Icon className="h-5 w-5 text-primary icon-hover" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground counter-animate">{displayed}</p>
          </div>
        </div>
        {change && (
          <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
            trend === "up" 
              ? "text-success bg-success/10" 
              : "text-destructive bg-destructive/10"
          }`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
