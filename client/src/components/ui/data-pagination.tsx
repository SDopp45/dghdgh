import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface DataPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function DataPagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  className
}: DataPaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  return (
    <div className={cn("mt-6", className)}>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
            />
          </PaginationItem>

          {Array.from({ length: totalPages }).map((_, i) => {
            const page = i + 1;
            const isCurrentPage = page === currentPage;
            const isNearCurrent = Math.abs(page - currentPage) <= 1;
            const isFirstPage = page === 1;
            const isLastPage = page === totalPages;

            if (isNearCurrent || isFirstPage || isLastPage) {
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => onPageChange(page)}
                    isActive={isCurrentPage}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            } else if (page === 2 || page === totalPages - 1) {
              return <PaginationEllipsis key={page} />;
            }
            return null;
          })}

          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
