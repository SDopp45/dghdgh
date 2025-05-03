import { Badge } from "@/components/ui/badge";
import { Calendar, CheckSquare, XCircle, UserX, RefreshCcw, Info } from "lucide-react";

export type VisitStatus = "scheduled" | "completed" | "cancelled" | "no_show" | "rescheduled";

export function getStatusLabel(status: VisitStatus): string {
  switch (status) {
    case "scheduled":
      return "Planifiée";
    case "completed":
      return "Terminée";
    case "cancelled":
      return "Annulée";
    case "no_show":
      return "Absence";
    case "rescheduled":
      return "Reportée";
    default:
      return status;
  }
}

export function getStatusClass(status: VisitStatus) {
  switch (status) {
    case "scheduled":
      return "bg-[#70C7BA] text-white";
    case "completed":
      return "bg-teal-500 text-white";
    case "cancelled":
      return "bg-[#49EACB]/10 text-[#70C7BA]";
    case "no_show":
      return "bg-red-500 text-white";
    case "rescheduled":
      return "bg-blue-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
}

export function getStatusIcon(status: VisitStatus) {
  switch (status) {
    case "scheduled":
      return <Calendar className="h-4 w-4 text-white" />;
    case "completed":
      return <CheckSquare className="h-4 w-4 text-white" />;
    case "cancelled":
      return <XCircle className="h-4 w-4 text-[#70C7BA]" />;
    case "no_show":
      return <UserX className="h-4 w-4 text-white" />;
    case "rescheduled":
      return <RefreshCcw className="h-4 w-4 text-white" />;
    default:
      return <Info className="h-4 w-4 text-white" />;
  }
}

export function getStatusBadge(status: VisitStatus) {
  return (
    <Badge className={`inline-flex items-center gap-1 py-1 ${getStatusClass(status)}`}>
      {getStatusIcon(status)}
      <span>{getStatusLabel(status)}</span>
    </Badge>
  );
}

export function getStatusBgClass(status: VisitStatus) {
  switch (status) {
    case "scheduled":
      return "bg-[#70C7BA]/10 border-[#70C7BA]/30";
    case "completed":
      return "bg-teal-50 border-teal-200";
    case "cancelled":
      return "bg-[#49EACB]/5 border-[#70C7BA]/20";
    case "no_show":
      return "bg-red-50 border-red-200";
    case "rescheduled":
      return "bg-blue-50 border-blue-200";
    default:
      return "bg-gray-50 border-gray-200";
  }
}

export function getStatusTextClass(status: VisitStatus) {
  switch (status) {
    case "scheduled":
      return "text-[#70C7BA]";
    case "completed":
      return "text-teal-700";
    case "cancelled":
      return "text-[#70C7BA]/70";
    case "no_show":
      return "text-red-700";
    case "rescheduled":
      return "text-blue-700";
    default:
      return "text-gray-700";
  }
} 