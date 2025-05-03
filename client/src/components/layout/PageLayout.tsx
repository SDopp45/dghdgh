import React, { ReactNode } from 'react';
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Filter, SlidersHorizontal, ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  backHref?: string;
}

export function PageHeader({ 
  title, 
  description, 
  actions,
  backHref 
}: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div className="space-y-1">
        {backHref && (
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground" asChild>
            <a href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </a>
          </Button>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
}

interface PageContentProps {
  children: ReactNode;
  className?: string;
}

export function PageContent({ children, className }: PageContentProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {children}
    </div>
  );
}

interface PageSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageSection({ 
  title, 
  description, 
  children, 
  actions,
  className 
}: PageSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="space-y-1">
            {title && <h2 className="text-xl font-semibold tracking-tight">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className="pt-2">
        {children}
      </div>
    </section>
  );
}

interface PageTabsProps {
  tabs: {
    value: string;
    label: string;
    content: ReactNode;
  }[];
  defaultValue?: string;
  className?: string;
}

export function PageTabs({ tabs, defaultValue, className }: PageTabsProps) {
  return (
    <Tabs defaultValue={defaultValue || tabs[0].value} className={className}>
      <TabsList className="mb-4">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

interface PageActionsProps {
  children: ReactNode;
  className?: string;
}

export function PageActions({ children, className }: PageActionsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
    </div>
  );
}

export function NewItemButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <Button onClick={onClick} className="gap-1">
      <PlusCircle className="h-4 w-4" />
      {label}
    </Button>
  );
}

export function FilterButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button variant="outline" size="icon" onClick={onClick} title="Filtrer">
      <Filter className="h-4 w-4" />
    </Button>
  );
}

export function OptionsButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button variant="outline" size="icon" onClick={onClick} title="Options">
      <SlidersHorizontal className="h-4 w-4" />
    </Button>
  );
} 