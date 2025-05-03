import React, { ReactNode } from 'react';
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Building2, CalendarIcon, User, ArrowUpRight, ArrowDownRight, CircleDollarSign, Wrench, FileText, Hourglass, CheckCircle2, AlertCircle } from 'lucide-react';

interface DataCardProps {
  title: string;
  value: string | number;
  description?: string;
  footer?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: ReactNode;
  className?: string;
}

export function DataCard({ 
  title, 
  value, 
  description, 
  footer, 
  trend, 
  icon,
  className 
}: DataCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.isPositive ? (
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-rose-500" />
            )}
            <span className={cn(
              "text-xs font-medium",
              trend.isPositive ? "text-emerald-500" : "text-rose-500"
            )}>
              {trend.value}%
            </span>
          </div>
        )}
      </CardContent>
      {footer && <CardFooter className="pt-1 px-4 pb-4">{footer}</CardFooter>}
    </Card>
  );
}

interface PropertyCardProps {
  id: string;
  title: string;
  address: string;
  image?: string;
  type: string;
  status: 'occupied' | 'vacant' | 'maintenance' | 'reserved';
  onClick?: () => void;
  className?: string;
}

export function PropertyCard({ 
  id, 
  title, 
  address, 
  image, 
  type,
  status,
  onClick, 
  className 
}: PropertyCardProps) {
  const statusConfig = {
    occupied: { label: 'Occupé', color: 'bg-emerald-500' },
    vacant: { label: 'Vacant', color: 'bg-amber-500' },
    maintenance: { label: 'En maintenance', color: 'bg-rose-500' },
    reserved: { label: 'Réservé', color: 'bg-blue-500' }
  };
  
  return (
    <Card 
      onClick={onClick} 
      className={cn(
        "overflow-hidden cursor-pointer transition-all hover:shadow-md group",
        className
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        {image ? (
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <Building2 className="h-12 w-12 text-gray-300" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge className={cn("text-white", statusConfig[status].color)}>
            {statusConfig[status].label}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-base mb-1 line-clamp-1">{title}</h3>
        <p className="text-muted-foreground text-xs mb-2">{address}</p>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {type}
          </Badge>
          <span className="text-xs text-muted-foreground">ID: {id}</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface TenantCardProps {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'active' | 'late' | 'former';
  property?: string;
  avatarUrl?: string;
  rating?: number;
  onClick?: () => void;
  className?: string;
}

export function TenantCard({ 
  id, 
  name, 
  email, 
  phone, 
  status,
  property,
  avatarUrl,
  rating,
  onClick, 
  className 
}: TenantCardProps) {
  const statusConfig = {
    active: { label: 'Actif', color: 'bg-emerald-500' },
    late: { label: 'Retard', color: 'bg-amber-500' },
    former: { label: 'Ancien', color: 'bg-gray-500' }
  };
  
  const currentStatus = statusConfig[status] || { label: 'Inconnu', color: 'bg-gray-400' };
  
  return (
    <Card 
      onClick={onClick} 
      className={cn(
        "transition-all hover:shadow-md cursor-pointer",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-gray-200">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-base truncate">{name}</h3>
              <Badge className={cn("text-white", currentStatus.color)}>
                {currentStatus.label}
              </Badge>
            </div>
            {property && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Building2 className="h-3 w-3" /> {property}
              </p>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-3">
          {email && (
            <div className="text-xs">
              <span className="text-muted-foreground">Email:</span> 
              <span className="ml-1 truncate">{email}</span>
            </div>
          )}
          {phone && (
            <div className="text-xs">
              <span className="text-muted-foreground">Tél:</span> 
              <span className="ml-1">{phone}</span>
            </div>
          )}
        </div>
        
        {rating !== undefined && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Note:</span>
              <span className="text-xs font-medium">{rating}/5</span>
            </div>
            <Progress value={rating * 20} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TaskCardProps {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'canceled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  property?: string;
  assignee?: string;
  assigneeAvatar?: string;
  completionRate?: number;
  onClick?: () => void;
  className?: string;
}

export function TaskCard({ 
  id, 
  title, 
  status, 
  priority,
  dueDate,
  property,
  assignee,
  assigneeAvatar,
  completionRate,
  onClick, 
  className 
}: TaskCardProps) {
  const statusConfig = {
    pending: { label: 'En attente', icon: Hourglass, color: 'text-amber-500' },
    in_progress: { label: 'En cours', icon: Wrench, color: 'text-blue-500' },
    completed: { label: 'Terminé', icon: CheckCircle2, color: 'text-emerald-500' },
    canceled: { label: 'Annulé', icon: AlertCircle, color: 'text-gray-500' }
  };
  
  const priorityConfig = {
    low: { label: 'Faible', color: 'bg-gray-500' },
    medium: { label: 'Moyenne', color: 'bg-blue-500' },
    high: { label: 'Haute', color: 'bg-amber-500' },
    urgent: { label: 'Urgente', color: 'bg-rose-500' }
  };
  
  const StatusIcon = statusConfig[status].icon;
  
  return (
    <Card 
      onClick={onClick} 
      className={cn(
        "overflow-hidden transition-all hover:shadow-md cursor-pointer",
        className
      )}
    >
      <div className={cn(
        "h-1", 
        priorityConfig[priority].color
      )} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-base line-clamp-2">{title}</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <StatusIcon className={cn("h-5 w-5", statusConfig[status].color)} />
              </TooltipTrigger>
              <TooltipContent>
                <p>{statusConfig[status].label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {property && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-3">
            <Building2 className="h-3 w-3" /> {property}
          </p>
        )}
        
        <div className="flex items-center justify-between mt-3">
          {dueDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarIcon className="h-3 w-3" />
              <span>{dueDate}</span>
            </div>
          )}
          
          {assignee && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-6 w-6 border border-gray-200">
                    <AvatarImage src={assigneeAvatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {assignee.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{assignee}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {completionRate !== undefined && status === 'in_progress' && (
          <div className="mt-3">
            <Progress value={completionRate} className="h-1.5" />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-muted-foreground">{completionRate}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DocumentCardProps {
  id: string;
  title: string;
  type: string;
  uploadDate: string;
  size?: string;
  category?: string;
  thumbnail?: string;
  onClick?: () => void;
  className?: string;
}

export function DocumentCard({ 
  id, 
  title, 
  type, 
  uploadDate,
  size,
  category,
  thumbnail,
  onClick, 
  className 
}: DocumentCardProps) {  
  return (
    <Card 
      onClick={onClick} 
      className={cn(
        "overflow-hidden transition-all hover:shadow-md cursor-pointer group",
        className
      )}
    >
      <div className="aspect-[3/2] overflow-hidden bg-gray-100 relative">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <FileText className="h-12 w-12 text-gray-300" />
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-base mb-1 line-clamp-1">{title}</h3>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {type.toUpperCase()}
          </Badge>
          {size && <span className="text-xs text-muted-foreground">{size}</span>}
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">{uploadDate}</span>
          {category && (
            <Badge variant="secondary" className="text-xs">
              {category}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface FinanceCardProps {
  id: string;
  title: string;
  amount: number;
  currency?: string;
  date: string;
  type: 'income' | 'expense' | 'pending';
  category?: string;
  property?: string;
  onClick?: () => void;
  className?: string;
}

export function FinanceCard({ 
  id, 
  title, 
  amount, 
  currency = '€',
  date,
  type,
  category,
  property,
  onClick, 
  className 
}: FinanceCardProps) {
  const typeConfig = {
    income: { color: 'text-emerald-500', bgColor: 'bg-emerald-50', icon: ArrowUpRight },
    expense: { color: 'text-rose-500', bgColor: 'bg-rose-50', icon: ArrowDownRight },
    pending: { color: 'text-amber-500', bgColor: 'bg-amber-50', icon: Hourglass }
  };
  
  const TypeIcon = typeConfig[type].icon;
  
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: currency.toUpperCase() === 'EUR' ? 'EUR' : currency 
    }).format(amount);
  };
  
  return (
    <Card 
      onClick={onClick} 
      className={cn(
        "overflow-hidden transition-all hover:shadow-md cursor-pointer",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center",
            typeConfig[type].bgColor
          )}>
            <TypeIcon className={cn("h-4 w-4", typeConfig[type].color)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base line-clamp-1">{title}</h3>
            <p className={cn(
              "font-semibold mt-1",
              typeConfig[type].color
            )}>
              {type === 'expense' ? '-' : ''}{formatAmount(amount)}
            </p>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{date}</span>
            {category && (
              <Badge variant="outline" className="text-xs">
                {category}
              </Badge>
            )}
          </div>
          
          {property && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <Building2 className="h-3 w-3" /> {property}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface VisitCardProps {
  id: string;
  property: string;
  propertyImage?: string;
  date: string;
  time: string;
  visitor: string;
  visitorAvatar?: string;
  status: 'scheduled' | 'completed' | 'canceled' | 'rescheduled';
  notes?: string;
  onClick?: () => void;
  className?: string;
}

export function VisitCard({ 
  id, 
  property, 
  propertyImage,
  date,
  time,
  visitor,
  visitorAvatar,
  status,
  notes,
  onClick, 
  className 
}: VisitCardProps) {
  const statusConfig = {
    scheduled: { label: 'Planifiée', color: 'bg-blue-500' },
    completed: { label: 'Effectuée', color: 'bg-emerald-500' },
    canceled: { label: 'Annulée', color: 'bg-rose-500' },
    rescheduled: { label: 'Reportée', color: 'bg-amber-500' }
  };
  
  return (
    <Card 
      onClick={onClick} 
      className={cn(
        "overflow-hidden transition-all hover:shadow-md cursor-pointer",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-1/3 aspect-square sm:aspect-auto overflow-hidden bg-gray-100">
          {propertyImage ? (
            <img 
              src={propertyImage} 
              alt={property} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <Building2 className="h-12 w-12 text-gray-300" />
            </div>
          )}
        </div>
        <div className="p-4 sm:w-2/3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-base line-clamp-1">{property}</h3>
            <Badge className={cn("text-white", statusConfig[status].color)}>
              {statusConfig[status].label}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{date}</span>
            </div>
            <div className="text-muted-foreground">•</div>
            <span className="text-sm">{time}</span>
          </div>
          
          <div className="flex items-center gap-2 mt-3">
            <Avatar className="h-6 w-6 border border-gray-200">
              <AvatarImage src={visitorAvatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {visitor.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{visitor}</span>
          </div>
          
          {notes && (
            <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
              {notes}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
} 