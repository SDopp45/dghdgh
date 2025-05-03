import React from 'react';
import { useWidgetStore, Widget } from '@/lib/stores/useWidgetStore';
import { BaseWidget } from './BaseWidget';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

interface DashboardWidgetProps {
  widget: Widget;
  children: React.ReactNode;
  dragHandleProps?: any;
}

export function DashboardWidget({ widget, children, dragHandleProps }: DashboardWidgetProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const { removeWidget } = useWidgetStore();
  const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);

  // Définir les classes CSS des dimensions de widget en utilisant les dimensions du widget
  const widgetClasses = React.useMemo(() => {
    const width = widget.size?.width || 1;
    const height = widget.size?.height || 1;
    return `widget-container size-${width}x${height} col-span-${width} row-span-${height}`;
  }, [widget.size?.width, widget.size?.height]);

  // Configurer le portail pour le mode plein écran
  React.useEffect(() => {
    if (!isFullscreen) {
      setPortalContainer(null);
      return;
    }

    // Créer ou récupérer l'élément modal
    let modalRoot = document.getElementById('fullscreen-modal-root');
    if (!modalRoot) {
      modalRoot = document.createElement('div');
      modalRoot.id = 'fullscreen-modal-root';
      Object.assign(modalRoot.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '9999',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1rem',
        backdropFilter: 'blur(8px)'
      });
      document.body.appendChild(modalRoot);
    }
    
    setPortalContainer(modalRoot);

    // Nettoyer
    return () => {
      if (modalRoot && document.body.contains(modalRoot)) {
        document.body.removeChild(modalRoot);
      }
    };
  }, [isFullscreen]);

  // Gérer la suppression du widget
  const handleRemove = React.useCallback(() => {
    removeWidget(widget.id);
  }, [removeWidget, widget.id]);

  // Gérer le basculement du mode plein écran
  const handleFullscreenChange = React.useCallback((fullscreen: boolean) => {
    setIsFullscreen(fullscreen);
  }, []);

  // Rendu du widget en mode normal
  const normalWidget = (
    <div
      id={`widget-${widget.id}`}
      data-widget-id={widget.id}
      data-widget-type={widget.type}
      data-widget-size={`${widget.size?.width || 1}x${widget.size?.height || 1}`}
      data-width={widget.size?.width || 1}
      data-height={widget.size?.height || 1}
      data-widget-pinned={widget.pinned ? 'true' : 'false'}
      className={cn(
        widgetClasses,
        'relative'
      )}
    >
      <BaseWidget
        widget={widget}
        onRemove={handleRemove}
        dragHandleProps={dragHandleProps}
        isFullscreen={isFullscreen}
        onFullscreenChange={handleFullscreenChange}
      >
        {children}
      </BaseWidget>
    </div>
  );

  // Rendu du widget en mode plein écran
  if (isFullscreen && portalContainer) {
    return createPortal(
      <div className="w-[95vw] h-[95vh] max-w-7xl max-h-[800px]">
        <BaseWidget
          widget={widget}
          onRemove={handleRemove}
          isFullscreen={true}
          onFullscreenChange={handleFullscreenChange}
        >
          {children}
        </BaseWidget>
      </div>,
      portalContainer
    );
  }

  return normalWidget;
} 