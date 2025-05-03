import React, { useState } from 'react';
import { PageHeader, PageContent, PageSection, PageActions, NewItemButton, FilterButton, OptionsButton } from '@/components/layout/PageLayout';
import { DataCard } from '@/components/ui/data-cards';
import { PropertyCard } from '@/components/ui/data-cards';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Search, SlidersHorizontal, MoreHorizontal, Map, Grid3x3 } from 'lucide-react';
import MainLayout from "@/components/layout/MainLayout";

export default function PropertiesPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data - to be replaced with actual API calls
  const stats = [
    { title: 'Total des propriétés', value: '24', icon: <Building2 className="h-4 w-4" /> },
    { title: 'Taux d'occupation', value: '89%', trend: { value: 4, isPositive: true } },
    { title: 'Propriétés vacantes', value: '3', description: 'Disponibles à la location' },
    { title: 'En maintenance', value: '2', trend: { value: 1, isPositive: false } },
  ];
  
  const properties = [
    {
      id: 'PROP001',
      title: 'Appartement Haussmannien',
      address: '15 rue du Commerce, 75015 Paris',
      image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994',
      type: 'Appartement',
      status: 'occupied' as const
    },
    {
      id: 'PROP002',
      title: 'Maison de Campagne',
      address: '3 chemin des Vignes, 78120 Rambouillet',
      image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233',
      type: 'Maison',
      status: 'vacant' as const
    },
    {
      id: 'PROP003',
      title: 'Studio Centre Ville',
      address: '42 boulevard Saint Michel, 75006 Paris',
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
      type: 'Studio',
      status: 'reserved' as const
    },
    {
      id: 'PROP004',
      title: 'Duplex Moderne',
      address: '8 avenue Victor Hugo, 75016 Paris',
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
      type: 'Duplex',
      status: 'maintenance' as const
    },
    {
      id: 'PROP005',
      title: 'Loft Industriel',
      address: '27 rue des Rosiers, 93400 Saint-Ouen',
      image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb',
      type: 'Loft',
      status: 'occupied' as const
    },
    {
      id: 'PROP006',
      title: 'Pavillon Familial',
      address: '12 allée des Tilleuls, 92210 Saint-Cloud',
      image: 'https://images.unsplash.com/photo-1571055107559-3e67626fa8be',
      type: 'Pavillon',
      status: 'occupied' as const
    }
  ];
  
  // Filter properties based on search term
  const filteredProperties = properties.filter(property => {
    return (
      property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  return (
    <MainLayout>
      <PageHeader
        title="Propriétés"
        description="Gérez votre portefeuille immobilier"
        actions={
          <PageActions>
            <NewItemButton label="Ajouter une propriété" onClick={() => {}} />
            <FilterButton onClick={() => {}} />
            <OptionsButton onClick={() => {}} />
          </PageActions>
        }
      />
      
      <PageContent>
        {/* Statistiques */}
        <PageSection>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <DataCard
                key={index}
                title={stat.title}
                value={stat.value}
                description={stat.description}
                trend={stat.trend}
                icon={stat.icon}
              />
            ))}
          </div>
        </PageSection>
        
        {/* Filtres et vue */}
        <PageSection>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input 
                type="search" 
                placeholder="Rechercher une propriété..." 
                className="pl-9" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>Filtres</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <div className="p-2">
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2">Type de bien</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox id="type-all" />
                          <label htmlFor="type-all" className="text-sm cursor-pointer">Tous</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="type-apartment" />
                          <label htmlFor="type-apartment" className="text-sm cursor-pointer">Appartement</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="type-house" />
                          <label htmlFor="type-house" className="text-sm cursor-pointer">Maison</label>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Statut</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox id="status-all" />
                          <label htmlFor="status-all" className="text-sm cursor-pointer">Tous</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="status-occupied" />
                          <label htmlFor="status-occupied" className="text-sm cursor-pointer">Occupé</label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox id="status-vacant" />
                          <label htmlFor="status-vacant" className="text-sm cursor-pointer">Vacant</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? "default" : "ghost"}
                  size="sm"
                  className="h-9 rounded-r-none border-r"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? "default" : "ghost"}
                  size="sm"
                  className="h-9 rounded-l-none"
                  onClick={() => setViewMode('list')}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </PageSection>
        
        {/* Tabs pour la gestion des propriétés */}
        <PageSection>
          <Tabs defaultValue="all">
            <TabsList className="mb-6">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#70C7BA]"
              >
                Toutes les propriétés
              </TabsTrigger>
              <TabsTrigger 
                value="occupied" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#70C7BA]"
              >
                Occupées
              </TabsTrigger>
              <TabsTrigger 
                value="vacant" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#70C7BA]"
              >
                Vacantes
              </TabsTrigger>
              <TabsTrigger 
                value="maintenance" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-[#70C7BA]"
              >
                En maintenance
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-6">
              {filteredProperties.length > 0 ? (
                <div className={`grid grid-cols-1 ${viewMode === 'grid' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-1'} gap-6`}>
                  {filteredProperties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      id={property.id}
                      title={property.title}
                      address={property.address}
                      image={property.image}
                      type={property.type}
                      status={property.status}
                      onClick={() => {}}
                      className={viewMode === 'list' ? 'sm:flex sm:flex-row overflow-hidden' : ''}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Building2 className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-4 text-lg font-medium">Aucune propriété trouvée</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Essayez de modifier vos critères de recherche ou d'ajouter une nouvelle propriété.
                  </p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="occupied">
              <div className={`grid grid-cols-1 ${viewMode === 'grid' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-1'} gap-6`}>
                {filteredProperties
                  .filter(p => p.status === 'occupied')
                  .map((property) => (
                    <PropertyCard
                      key={property.id}
                      id={property.id}
                      title={property.title}
                      address={property.address}
                      image={property.image}
                      type={property.type}
                      status={property.status}
                      onClick={() => {}}
                      className={viewMode === 'list' ? 'sm:flex sm:flex-row overflow-hidden' : ''}
                    />
                  ))}
              </div>
            </TabsContent>
            
            <TabsContent value="vacant">
              <div className={`grid grid-cols-1 ${viewMode === 'grid' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-1'} gap-6`}>
                {filteredProperties
                  .filter(p => p.status === 'vacant')
                  .map((property) => (
                    <PropertyCard
                      key={property.id}
                      id={property.id}
                      title={property.title}
                      address={property.address}
                      image={property.image}
                      type={property.type}
                      status={property.status}
                      onClick={() => {}}
                      className={viewMode === 'list' ? 'sm:flex sm:flex-row overflow-hidden' : ''}
                    />
                  ))}
              </div>
            </TabsContent>
            
            <TabsContent value="maintenance">
              <div className={`grid grid-cols-1 ${viewMode === 'grid' ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-1'} gap-6`}>
                {filteredProperties
                  .filter(p => p.status === 'maintenance')
                  .map((property) => (
                    <PropertyCard
                      key={property.id}
                      id={property.id}
                      title={property.title}
                      address={property.address}
                      image={property.image}
                      type={property.type}
                      status={property.status}
                      onClick={() => {}}
                      className={viewMode === 'list' ? 'sm:flex sm:flex-row overflow-hidden' : ''}
                    />
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </PageSection>
      </PageContent>
    </MainLayout>
  );
} 