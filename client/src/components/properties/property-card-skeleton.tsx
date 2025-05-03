import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export function PropertyCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      {/* Image skeleton */}
      <Skeleton className="w-full h-[200px]" />
      
      <CardHeader className="space-y-2">
        {/* Title skeleton */}
        <Skeleton className="h-6 w-3/4" />
        {/* Address skeleton */}
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Property details skeletons */}
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        
        {/* Stats skeletons */}
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end gap-2">
        {/* Action buttons skeletons */}
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </CardFooter>
    </Card>
  );
}
