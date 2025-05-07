import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, LayersControl } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Map as MapIcon, Euro, Home, Maximize2, Building2, Store, ParkingCircle, Car, Building, Package, Ruler, X, Info, ArrowUpDown, LayoutTemplate, Warehouse, Sofa, Bed, Bath } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { PropertyDetailsDialog } from './property-details-dialog';
import L from 'leaflet';
import './leaflet-custom.css';

const propertyTypeIcons = {
  apartment: `<path d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M10,17H8v-2h2V17z M10,13H8v-2h2V13z M10,9H8V7h2V9z M14,17h-2v-2h2V17z M14,13h-2v-2h2V13z M14,9h-2V7h2V9z M18,17h-2v-2h2V17z M18,13h-2v-2h2V13z M18,9h-2V7h2V9z"/>`,
  house: `<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>`,
  commercial: `<path d="M21.9 8v14H2.1V8h19.8zM12 22v-6m9.9-8H2.1m16.5 0V4H5.4v4" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M15 15h2v3h-2z"/>`,
  parking: `<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><text x="12" y="16" text-anchor="middle" fill="white" style="font-size: 12px; font-weight: bold;">P</text>`,
  garage: `<path d="M20 22H4a2 2 0 01-2-2V10l10-7 10 7v10a2 2 0 01-2 2zm-8-5h4m-4-3h4m-4-3h4M8 22v-3h8v3" stroke="currentColor" fill="none" stroke-width="1.5"/><path d="M4 12h16v7H4z"/>`,
  land: `<path d="M12 3L2 9l2 1v10h16V10l2-1-10-6zM4 20v-8l8-5 8 5v8H4z"/><path d="M12 20v-8l-4 2v6h4zm0-8l4 2v6h-4v-8z"/><path d="M8 14l4-2 4 2-4 2-4-2z"/>`,
  office: `<path d="M12 22H4a2 2 0 01-2-2V7l4-3 4 3v15zm8 0h-8V7l4-3 4 3v13a2 2 0 01-0 2z" stroke="currentColor" fill="none" stroke-width="1.5"/><path d="M10 12h4m-4 4h4M6 12h2m-2 4h2"/>`,
  building: `<path d="M17 22V5c0-1.7-1.3-3-3-3h-4c-1.7 0-3 1.3-3 3v17h10zM7 7h10M7 12h10M7 17h10" stroke="currentColor" fill="none" stroke-width="1.5"/><path d="M11 22v-3h2v3m-6-7h2m2 0h2m2 0h2"/>`,
  storage: `<path d="M21 7v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2zM3 7h18M3 13h18" stroke="currentColor" fill="none" stroke-width="1.5"/><path d="M7 10v6m5-6v6m5-6v6"/>`,
};

const statusColors = {
  available: "#10B981",
  rented: "#3B82F6",
  maintenance: "#F59E0B",
  sold: "#EF4444",
};

const statusLabels = {
  available: "Disponible",
  rented: "Loué",
  maintenance: "En maintenance",
  sold: "Vendu"
};

const propertyTypeLabels = {
  apartment: "Appartement",
  house: "Maison",
  commercial: "Local commercial",
  parking: "Parking",
  garage: "Garage",
  land: "Terrain",
  office: "Bureau",
  building: "Immeuble",
  storage: "Stockage",
};

const createMarkerIcon = (type: string, status: 'available' | 'rented' | 'maintenance' | 'sold') => {
  const iconPath = propertyTypeIcons[type as keyof typeof propertyTypeIcons] || propertyTypeIcons.house;
  const svgIcon = `
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="${statusColors[status]}" stroke="white" stroke-width="2"/>
      <g transform="translate(8,8) scale(1)" fill="white">
        ${iconPath}
      </g>
    </svg>
  `;

  const base64Icon = btoa(svgIcon);

  return L.divIcon({
    className: 'custom-div-icon',
    html: `<img src="data:image/svg+xml;base64,${base64Icon}" style="width: 40px; height: 40px;">`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

const createTypeIconForLegend = (type: string) => {
  const iconPath = propertyTypeIcons[type as keyof typeof propertyTypeIcons] || propertyTypeIcons.house;
  const svgIcon = `
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="#e2e8f0" stroke="white" stroke-width="2"/>
      <g transform="translate(8,8) scale(1)" fill="currentColor">
        ${iconPath}
      </g>
    </svg>
  `;
  const base64Icon = btoa(svgIcon);
  return `data:image/svg+xml;base64,${base64Icon}`;
};

function FlyToMarker({ coordinates }: { coordinates: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(coordinates, map.getZoom(), {
      duration: 1.5,
      easeLinearity: 0.25
    });
  }, [map, coordinates]);

  return null;
}

function FullscreenControl() {
  const map = useMap();

  const toggleFullscreen = () => {
    const container = map.getContainer();
    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="leaflet-top leaflet-right" style={{ marginTop: '80px' }}>
      <div className="leaflet-control leaflet-bar">
        <a 
          href="#"
          onClick={(e) => {
            e.preventDefault();
            toggleFullscreen();
          }}
          title="Vue plein écran"
          role="button"
          className="flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Maximize2 className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

export function PropertyMapView({ properties, selectedPropertyId }: PropertyMapViewProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [visibleStatuses, setVisibleStatuses] = useState<Set<string>>(
    new Set(['available', 'rented', 'maintenance', 'sold'])
  );
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(
    new Set(['apartment', 'house', 'commercial', 'parking', 'garage', 'land', 'office', 'building', 'storage'])
  );
  const [activeMap, setActiveMap] = useState<string>("OpenStreetMap");
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const { data: coordinates = [], isLoading } = useQuery<Coordinates[]>({
    queryKey: ['/api/property-features/coordinates', properties.map(p => p.id).join(',')],
    queryFn: async () => {
      const propertyIds = properties.map(p => p.id).join(',');
      console.log('Fetching coordinates for properties:', propertyIds);
      const response = await fetch(`/api/property-features/coordinates?propertyIds=${propertyIds}`);
      if (!response.ok) {
        console.error('Error fetching coordinates:', response.statusText);
        throw new Error("Erreur lors du chargement des coordonnées");
      }
      const data = await response.json();
      console.log('Received coordinates:', data);
      return data;
    },
    enabled: properties.length > 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  const formatCurrency = (amount?: number) => {
    if (!amount || amount === 0) return '---';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPropertyCoordinates = (propertyId: number): [number, number] | null => {
    const coord = coordinates.find(c => c.propertyId === propertyId);
    return coord ? [coord.latitude, coord.longitude] : null;
  };

  const defaultCenter: [number, number] = [48.8566, 2.3522];
  const validProperties = properties.filter(p => p && p.id && visibleStatuses.has(p.status) && visibleTypes.has(p.type));
  const selectedCoordinates = selectedPropertyId ? getPropertyCoordinates(selectedPropertyId) : null;

  const handleViewDetails = (property: Property) => {
    // Récupérer les données complètes de la propriété avant d'afficher les détails
    console.log("Récupération des détails pour la propriété:", property.name, property.id);
    
    fetch(`/api/properties/${property.id}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des détails de la propriété');
        }
        return response.json();
      })
      .then(data => {
        console.log("Données complètes chargées pour la propriété:", data);
        console.log("Images disponibles:", data.images);
        
        // S'assurer que la propriété a un tableau d'images
        if (!data.images) {
          data.images = [];
        }
        
        // Si la propriété n'a pas d'image, ajouter l'image par défaut
        if (data.images.length === 0) {
          const defaultImageName = `${data.type}-default.jpg`;
          console.log("Ajout de l'image par défaut:", defaultImageName);
          data.images.push({ filename: defaultImageName });
        }
        
        // Nettoyer les données numériques pour éviter les valeurs "00"
        const cleanedData = {
          ...data,
          purchasePrice: data.purchasePrice && Number(data.purchasePrice) > 0 ? data.purchasePrice : undefined,
          monthlyRent: data.monthlyRent && Number(data.monthlyRent) > 0 ? data.monthlyRent : undefined,
          monthlyExpenses: data.monthlyExpenses && Number(data.monthlyExpenses) > 0 ? data.monthlyExpenses : undefined,
          loanAmount: data.loanAmount && Number(data.loanAmount) > 0 ? data.loanAmount : undefined,
          loanDuration: data.loanDuration && Number(data.loanDuration) > 0 ? data.loanDuration : undefined,
          monthlyLoanPayment: data.monthlyLoanPayment && Number(data.monthlyLoanPayment) > 0 ? data.monthlyLoanPayment : undefined,
          area: data.area && Number(data.area) > 0 ? data.area : undefined,
          livingArea: data.livingArea && Number(data.livingArea) > 0 ? data.livingArea : undefined,
          landArea: data.landArea && Number(data.landArea) > 0 ? data.landArea : undefined,
          rooms: data.rooms && Number(data.rooms) > 0 ? data.rooms : undefined,
          bedrooms: data.bedrooms && Number(data.bedrooms) > 0 ? data.bedrooms : undefined,
          bathrooms: data.bathrooms && Number(data.bathrooms) > 0 ? data.bathrooms : undefined,
          toilets: data.toilets && Number(data.toilets) > 0 ? data.toilets : undefined,
          floors: data.floors && Number(data.floors) > 0 ? data.floors : undefined,
          units: data.units && Number(data.units) > 0 ? data.units : undefined,
          constructionYear: data.constructionYear && Number(data.constructionYear) > 0 ? data.constructionYear : undefined,
        };
        
        setSelectedProperty(cleanedData);
        setIsDetailsOpen(true);
      })
      .catch(error => {
        console.error("Erreur lors du chargement des détails:", error);
        // En cas d'erreur, utiliser les données partielles mais s'assurer qu'il y a un tableau d'images
        if (!property.images) {
          property.images = [];
        }
        
        // Si la propriété n'a pas d'image, ajouter l'image par défaut
        if (property.images.length === 0) {
          const defaultImageName = `${property.type}-default.jpg`;
          console.log("Ajout de l'image par défaut (fallback):", defaultImageName);
          property.images.push({ filename: defaultImageName });
        }
        
        // Nettoyer les données numériques pour éviter les valeurs "00"
        const cleanedProperty = {
          ...property,
          purchasePrice: property.purchasePrice && Number(property.purchasePrice) > 0 ? property.purchasePrice : undefined,
          monthlyRent: property.monthlyRent && Number(property.monthlyRent) > 0 ? property.monthlyRent : undefined,
          monthlyExpenses: property.monthlyExpenses && Number(property.monthlyExpenses) > 0 ? property.monthlyExpenses : undefined,
          area: property.area && Number(property.area) > 0 ? property.area : undefined,
          livingArea: property.livingArea && Number(property.livingArea) > 0 ? property.livingArea : undefined,
          landArea: property.landArea && Number(property.landArea) > 0 ? property.landArea : undefined,
          rooms: property.rooms && Number(property.rooms) > 0 ? property.rooms : undefined,
          bedrooms: property.bedrooms && Number(property.bedrooms) > 0 ? property.bedrooms : undefined,
          bathrooms: property.bathrooms && Number(property.bathrooms) > 0 ? property.bathrooms : undefined,
          toilets: property.toilets && Number(property.toilets) > 0 ? property.toilets : undefined,
          floors: property.floors && Number(property.floors) > 0 ? property.floors : undefined,
          units: property.units && Number(property.units) > 0 ? property.units : undefined,
          constructionYear: property.constructionYear && Number(property.constructionYear) > 0 ? property.constructionYear : undefined,
        };
        
        setSelectedProperty(cleanedProperty);
    setIsDetailsOpen(true);
      });
  };

  const toggleStatus = (status: string) => {
    setVisibleStatuses(prev => {
      const newStatuses = new Set(prev);
      if (newStatuses.has(status)) {
        newStatuses.delete(status);
      } else {
        newStatuses.add(status);
      }
      return newStatuses;
    });
  };

  const toggleType = (type: string) => {
    setVisibleTypes(prev => {
      const newTypes = new Set(prev);
      if (newTypes.has(type)) {
        newTypes.delete(type);
      } else {
        newTypes.add(type);
      }
      return newTypes;
    });
  };


  return (
    <Card className="mt-6 border-gradient-to-r from-blue-200 to-cyan-200 dark:from-blue-900 dark:to-cyan-900 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-blue-600 dark:text-blue-400">
          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
          <MapIcon className="h-5 w-5" />
          </div>
          Carte des Propriétés
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium mb-1 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                Filtrer par statut
              </h3>
              <div className="flex flex-wrap gap-2">
              {Object.entries(statusLabels).map(([status, label]) => (
                  <motion.div
                  key={status}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  onClick={() => toggleStatus(status)}
                  className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all border",
                      visibleStatuses.has(status)
                        ? `border-${status === 'available' ? 'emerald' : status === 'rented' ? 'blue' : status === 'maintenance' ? 'amber' : 'red'}-400 bg-${status === 'available' ? 'emerald' : status === 'rented' ? 'blue' : status === 'maintenance' ? 'amber' : 'red'}-50 dark:bg-${status === 'available' ? 'emerald' : status === 'rented' ? 'blue' : status === 'maintenance' ? 'amber' : 'red'}-900/30`
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-60"
                  )}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: statusColors[status as keyof typeof statusColors] }}
                  />
                    <span className="text-sm font-medium">{label}</span>
                  </motion.div>
              ))}
            </div>
          </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium mb-1 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                Filtrer par type de bien
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(propertyTypeLabels).map(([type, label]) => (
                  <motion.div
                  key={type}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  onClick={() => toggleType(type)}
                  className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all border",
                      visibleTypes.has(type)
                        ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-60"
                  )}
                >
                  <img
                    src={createTypeIconForLegend(type)}
                    alt={type}
                    className="h-6 w-6"
                    style={{ filter: visibleTypes.has(type) ? 'none' : 'grayscale(100%)' }}
                  />
                    <span className="text-sm font-medium">{label}</span>
                  </motion.div>
                ))}
                </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="w-full h-[600px] flex items-center justify-center bg-blue-50 dark:bg-blue-950/20 rounded-lg mt-6 border border-blue-100 dark:border-blue-900">
            <div className="flex flex-col items-center gap-3">
              <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-blue-600 dark:text-blue-400 font-medium">Chargement de la carte...</span>
            </div>
          </div>
        ) : (
          <motion.div
            className={cn(
              "w-full relative rounded-lg overflow-hidden mt-6 border border-blue-200 dark:border-blue-800 shadow-lg",
              isMapFullscreen ? "fixed inset-0 z-50 h-screen w-screen rounded-none border-0" : "h-[600px]"
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {isMapFullscreen && (
              <div className="absolute top-4 right-4 z-10 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => {
                    if (document.fullscreenElement) {
                      document.exitFullscreen();
                    }
                    setIsMapFullscreen(false);
                  }}
                  className="h-8 w-8 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="absolute top-4 left-4 z-10 bg-white dark:bg-gray-800 rounded-lg p-1.5 shadow-lg flex gap-1.5">
              <Button 
                size="sm" 
                variant={activeMap === "OpenStreetMap" ? "default" : "outline"} 
                onClick={() => setActiveMap("OpenStreetMap")}
                className="h-8 text-xs px-2"
              >
                Plan
              </Button>
              <Button 
                size="sm" 
                variant={activeMap === "Satellite" ? "default" : "outline"} 
                onClick={() => setActiveMap("Satellite")}
                className="h-8 text-xs px-2"
              >
                Satellite
              </Button>
            </div>
            
            <MapContainer
              center={selectedCoordinates || defaultCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
              zoomControl={false}
            >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url={activeMap === "OpenStreetMap" ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"}
              />

              <ZoomControl position="bottomleft" />
              
              <div className="leaflet-top leaflet-right" style={{ marginTop: '10px' }}>
                <div className="leaflet-control leaflet-bar">
                  <a 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      const container = document.querySelector('.leaflet-container');
                      if (container && !document.fullscreenElement) {
                        container.requestFullscreen();
                      } else if (document.fullscreenElement) {
                        document.exitFullscreen();
                      }
                      setIsMapFullscreen(!isMapFullscreen);
                    }}
                    title="Vue plein écran"
                    role="button"
                    className="flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <div className="flex items-center justify-center">
                      <Maximize2 className="h-4 w-4" />
                    </div>
                  </a>
                </div>
              </div>

              {validProperties.map(property => {
                const coords = getPropertyCoordinates(property.id);
                if (!coords) return null;

                return (
                  <Marker
                    key={property.id}
                    position={coords}
                    icon={createMarkerIcon(property.type, property.status)}
                  >
                    <Popup className="property-popup" offset={[0, -10]}>
                      <div className="p-3 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium text-lg">
                            {property.name}
                          </h3>
                        </div>
                        
                        <div className="flex flex-wrap gap-1.5">
                            <Badge
                              variant="outline"
                              className="bg-secondary/30 text-secondary-foreground text-xs"
                            >
                              {propertyTypeLabels[property.type as keyof typeof propertyTypeLabels]}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-white text-xs",
                                property.status === "available" && "bg-emerald-500",
                                property.status === "rented" && "bg-blue-500",
                                property.status === "maintenance" && "bg-amber-500",
                                property.status === "sold" && "bg-red-500"
                              )}
                            >
                              {statusLabels[property.status]}
                            </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground border-l-2 border-gray-300 pl-2 italic">
                          {property.address}
                        </p>

                        <Button
                          size="sm"
                          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
                          onClick={() => handleViewDetails(property)}
                        >
                          Voir les détails
                        </Button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {selectedCoordinates && (
                <FlyToMarker coordinates={selectedCoordinates} />
              )}
            </MapContainer>
          </motion.div>
        )}
        
        {validProperties.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            <p>{validProperties.length} {validProperties.length > 1 ? 'propriétés affichées' : 'propriété affichée'} sur la carte</p>
          </div>
        )}
      </CardContent>

      {selectedProperty && (
        <PropertyDetailsDialog
          property={selectedProperty}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
        />
      )}
    </Card>
  );
}

export interface Property {
  id: number;
  name: string;
  address: string;
  type: string;
  status: 'available' | 'rented' | 'maintenance' | 'sold';
  purchasePrice?: number;
  monthlyRent?: number;
  monthlyExpenses?: number;
  energyClass: string;
  livingArea?: number;
  landArea?: number;
  area?: number;
  units?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  toilets?: number;
  floors?: number;
  constructionYear?: number;
  hasParking?: boolean;
  hasGarage?: boolean;
  hasTerrace?: boolean;
  hasBalcony?: boolean;
  hasElevator?: boolean;
  hasCellar?: boolean;
  hasGarden?: boolean;
  isNewConstruction?: boolean;
  isnewconstruction?: boolean;
  images?: Array<{ filename: string }>;
}

export interface PropertyMapViewProps {
  properties: Property[];
  selectedPropertyId?: number;
}

interface Coordinates {
  propertyId: number;
  latitude: number;
  longitude: number;
  property: Property;
}