import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { Home } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Définir les types pour les props
interface PropertyMapProps {
  properties: Array<{
    id: number;
    name: string;
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  }>;
  onMarkerClick?: (propertyId: number) => void;
  center?: [number, number]; // Latitude et longitude du centre de la carte
  zoom?: number;
}

// Position par défaut : Paris
const DEFAULT_CENTER: [number, number] = [48.8566, 2.3522];
const DEFAULT_ZOOM = 12;

export function PropertyMap({ 
  properties, 
  onMarkerClick,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM 
}: PropertyMapProps) {
  // Ajouter le CSS de Leaflet au head du document
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Créer une icône personnalisée pour les marqueurs
  const customIcon = new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {properties.map((property) => (
          <Marker
            key={property.id}
            position={[property.coordinates.latitude, property.coordinates.longitude]}
            icon={customIcon}
            eventHandlers={{
              click: () => onMarkerClick?.(property.id),
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{property.name}</h3>
                <p className="text-sm text-muted-foreground">{property.address}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
