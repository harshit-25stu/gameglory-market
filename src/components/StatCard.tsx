import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down";
}

const StatCard = ({ icon: Icon, label, value, change, trend }: StatCardProps) => {
  return (
    <div className="bg-gradient-card p-4 rounded-lg border border-border hover:border-primary/50 transition-all group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        </div>
        {change && (
          <span className={`text-sm font-medium ${trend === "up" ? "text-success" : "text-destructive"}`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
