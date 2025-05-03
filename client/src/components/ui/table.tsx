import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & {
    variant?: "default" | "modern"
    hoverable?: boolean
    dense?: boolean
  }
>(({ className, variant = "default", hoverable = true, dense = false, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn(
        "w-full caption-bottom text-sm",
        variant === "modern" && "modern-table",
        className
      )}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & {
    sticky?: boolean
  }
>(({ className, sticky = false, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      sticky && "sticky top-0 z-10 bg-background/95 backdrop-blur-sm",
      className
    )}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("", className)} {...props} />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("bg-muted/50 font-medium", className)}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & {
    hoverable?: boolean
  }
>(({ className, hoverable = true, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "transition-colors data-[state=selected]:bg-muted border-b border-border/40 last:border-0",
      hoverable && "hover:bg-muted/50 cursor-default",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & {
    sortable?: boolean
    sortDirection?: "asc" | "desc" | null
    onSort?: () => void
  }
>(({ className, children, sortable, sortDirection, onSort, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      sortable && "cursor-pointer select-none",
      sortable && sortDirection === "asc" && "sorted-asc",
      sortable && sortDirection === "desc" && "sorted-desc",
      className
    )}
    onClick={sortable ? onSort : undefined}
    {...props}
  >
    {sortable ? (
      <div className="flex items-center gap-1.5">
        <span>{children}</span>
        {sortDirection === "asc" ? (
          <ChevronUp className="h-3.5 w-3.5 text-primary" />
        ) : sortDirection === "desc" ? (
          <ChevronDown className="h-3.5 w-3.5 text-primary" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </div>
    ) : (
      children
    )}
  </th>
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
