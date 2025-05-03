import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Bell, User, Settings2, CalendarClock, Globe } from "lucide-react";
import { Link, useLocation } from "wouter";

export function SettingsNav() {
  const [location] = useLocation();

  const menuItems = [
    {
      href: "/settings/profile",
      label: "Profil & Sécurité",
      icon: User,
      description: "Informations personnelles et sécurité du compte"
    },
    {
      href: "/settings/notifications",
      label: "Notifications",
      icon: Bell,
      description: "Alertes et notifications"
    },
    {
      href: "/settings/localization",
      label: "Localisation",
      icon: Globe,
      description: "Format des dates et paramètres régionaux"
    },
    {
      href: "/settings/preferences",
      label: "Préférences",
      icon: Settings2,
      description: "Thème et paramètres généraux"
    },
  ];

  return (
    <NavigationMenu>
      <NavigationMenuList className="flex-wrap gap-2">
        {menuItems.map(({ href, label, icon: Icon, description }) => (
          <NavigationMenuItem key={href}>
            <Link href={href}>
              <NavigationMenuLink 
                className={`${navigationMenuTriggerStyle()} flex items-center gap-2 group ${
                  location === href ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </div>
                <span className="hidden group-hover:block text-xs text-muted-foreground ml-2">
                  {description}
                </span>
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}