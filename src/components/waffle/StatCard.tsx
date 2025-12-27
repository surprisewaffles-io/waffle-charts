import {
  ArrowUp,
  ArrowDown,
  DollarSign,
  Users,
  Activity,
  ShoppingCart,
  Percent,
  BarChart2,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { cn } from '../../lib/utils';
import React from 'react';

// Simple icon map for config-driven usage
const ICON_MAP: Record<string, React.ElementType> = {
  dollar: DollarSign,
  users: Users,
  activity: Activity,
  cart: ShoppingCart,
  percent: Percent,
  chart: BarChart2,
  trending: TrendingUp,
  card: CreditCard
};

export interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: string; // key from ICON_MAP
  trend?: {
    value: number; // percentage
    direction: 'up' | 'down' | 'neutral';
  };
  className?: string;
}

export function StatCard({ label, value, description, icon, trend, className }: StatCardProps) {
  const IconComponent = icon ? ICON_MAP[icon] : null;

  return (
    <div className={cn("flex flex-col justify-between h-full p-2 relative overflow-hidden group", className)}>

      {/* Background Decorator */}
      <div className="absolute -right-6 -top-6 bg-primary/5 w-24 h-24 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <div className="text-3xl font-bold tracking-tight text-foreground">{value}</div>
        </div>
        {IconComponent && (
          <div className="p-2 bg-primary/10 text-primary rounded-lg">
            <IconComponent className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between relative z-10">
        {trend && (
          <div className={cn("flex items-center text-xs font-bold px-2.5 py-1 rounded-full shadow-sm",
            trend.direction === 'up' ? "bg-emerald-600 text-white dark:bg-emerald-500" :
              trend.direction === 'down' ? "bg-red-600 text-white dark:bg-red-500" :
                "bg-slate-100 text-slate-800"
          )}>
            {trend.direction === 'up' ? <ArrowUp className="h-3 w-3 mr-1" /> :
              trend.direction === 'down' ? <ArrowDown className="h-3 w-3 mr-1" /> : null}
            {Math.abs(trend.value)}%
          </div>
        )}

        {description && (
          <span className="text-xs text-muted-foreground line-clamp-1 ml-auto pl-2">
            {description}
          </span>
        )}
      </div>
    </div>
  );
}
