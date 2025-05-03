// @ts-nocheck
import { AppearanceSettings } from '@/components/settings/appearance-settings';
import { Separator } from '@/components/ui/separator';

const AppearancePage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Apparence</h1>
        <p className="text-muted-foreground">
          Personnalisez l'apparence de votre interface Imùmo
        </p>
      </div>
      <Separator />
      <AppearanceSettings />
    </div>
  );
};

export default AppearancePage; 