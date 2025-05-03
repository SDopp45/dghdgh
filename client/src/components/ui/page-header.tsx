import { ReactNode } from "react";

interface PageHeaderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  gradient?: {
    from: string;
    via: string;
    to: string;
  };
}

export function PageHeader({ 
  icon, 
  title, 
  description, 
  children,
  gradient = {
    from: "primary",
    via: "purple-500",
    to: "blue-500"
  }
}: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 p-4 md:p-6 rounded-xl border border-primary/20 shadow-lg bg-card/40 backdrop-blur-xl w-full">
      <div className="flex-1">
        <h1 className={`text-4xl font-bold mb-2 bg-gradient-to-r from-${gradient.from} via-${gradient.via} to-${gradient.to} bg-clip-text text-transparent animate-gradient`}>
          {icon && <span className="inline-block mr-2">{icon}</span>}
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground text-lg">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex gap-2 mt-2 md:mt-0 w-full md:w-auto">
          {children}
        </div>
      )}
    </div>
  );
}