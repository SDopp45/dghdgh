import { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { fr } from 'date-fns/locale';
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { motion } from "framer-motion";

const locales = {
  'fr': fr,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'visit' | 'maintenance' | 'payment';
  description?: string;
  allDay?: boolean;
}

export function InteractiveCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isGoogleCalendarLinked, setIsGoogleCalendarLinked] = useState(false);

  // Fetch visits
  const { data: visits } = useQuery({
    queryKey: ["/api/visits"],
  });

  // Fetch maintenance requests
  const { data: maintenance } = useQuery({
    queryKey: ["/api/maintenance"],
  });

  // Fetch transactions (payments)
  const { data: transactions } = useQuery({
    queryKey: ["/api/transactions"],
  });

  useEffect(() => {
    // Combine all events
    const allEvents: CalendarEvent[] = [
      // Map visits to calendar events
      ...(visits?.map((visit: any) => ({
        id: `visit-${visit.id}`,
        title: `Visite: ${visit.property?.name}`,
        start: new Date(visit.datetime),
        end: new Date(new Date(visit.datetime).getTime() + 60 * 60 * 1000), // 1 hour duration
        type: 'visit' as const,
        description: `Visite avec ${visit.firstName} ${visit.lastName}`
      })) || []),
      
      // Map maintenance requests to calendar events
      ...(maintenance?.map((request: any) => ({
        id: `maintenance-${request.id}`,
        title: `Maintenance: ${request.title}`,
        start: new Date(request.scheduledDate || request.createdAt),
        end: new Date(request.scheduledEndDate || new Date(request.createdAt).getTime() + 2 * 60 * 60 * 1000),
        type: 'maintenance' as const,
        description: request.description
      })) || []),
      
      // Map transactions (payments) to calendar events
      ...(transactions?.map((transaction: any) => ({
        id: `payment-${transaction.id}`,
        title: `Paiement: ${transaction.description}`,
        start: new Date(transaction.date),
        end: new Date(transaction.date),
        type: 'payment' as const,
        allDay: true,
        description: `${transaction.type === 'income' ? 'Revenu' : 'Dépense'}: ${transaction.amount}€`
      })) || [])
    ];

    setEvents(allEvents);
  }, [visits, maintenance, transactions]);

  const eventStyleGetter = (event: CalendarEvent) => {
    let style: React.CSSProperties = {
      borderRadius: '4px',
      opacity: 0.8,
      color: '#fff',
      border: '0',
      display: 'block'
    };

    switch (event.type) {
      case 'visit':
        style.backgroundColor = '#818cf8'; // Indigo
        break;
      case 'maintenance':
        style.backgroundColor = '#f87171'; // Red
        break;
      case 'payment':
        style.backgroundColor = '#34d399'; // Emerald
        break;
      default:
        style.backgroundColor = '#94a3b8'; // Slate
    }

    return {
      style
    };
  };

  const handleGoogleCalendarLink = () => {
    // TODO: Implement Google Calendar OAuth flow
    window.alert('L\'intégration avec Google Calendar sera bientôt disponible !');
  };

  const handleAddEvent = () => {
    // TODO: Implement event creation modal
    window.alert('La création d\'événements sera bientôt disponible !');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendrier des événements
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoogleCalendarLink}
              className="flex items-center gap-2"
            >
              {isGoogleCalendarLinked ? '✓ Synchronisé' : 'Lier Google Calendar'}
            </Button>
            <Button
              size="sm"
              onClick={handleAddEvent}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="h-[600px]"
        >
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            eventPropGetter={eventStyleGetter}
            tooltipAccessor={(event: CalendarEvent) => event.description}
            messages={{
              next: "Suivant",
              previous: "Précédent",
              today: "Aujourd'hui",
              month: "Mois",
              week: "Semaine",
              day: "Jour",
              agenda: "Agenda",
              date: "Date",
              time: "Heure",
              event: "Événement",
              noEventsInRange: "Aucun événement dans cette période",
            }}
            culture="fr"
          />
        </motion.div>
      </CardContent>
    </Card>
  );
}
