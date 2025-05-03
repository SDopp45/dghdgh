import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { Link2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'email' | 'number' | 'checkbox' | 'select';
  label: string;
  required: boolean;
  options?: string[];
}

interface LinkItem {
  id: string;
  title: string;
  url: string;
  icon?: string;
  enabled: boolean;
  clicks: number;
  featured?: boolean;
  position?: number;
  customColor?: string;
  customTextColor?: string;
  animation?: string;
  iconSize?: number;
  type: 'link' | 'form';
  formDefinition?: FormField[];
}

interface LinkProfile {
  id: string;
  userId: string;
  slug: string;
  title: string;
  description: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  logoUrl: string;
  links: LinkItem[];
  views: number;
  backgroundImage?: string;
  backgroundPattern?: string;
  buttonStyle?: string;
  buttonRadius?: number;
  animation?: string;
  fontFamily?: string;
  iconSize?: number;
  patternColor?: string;
  patternOpacity?: number;
  patternSize?: number;
  patternAnimation?: string;
  backgroundBlur?: number;
  backgroundBrightness?: number;
  backgroundContrast?: number;
  backgroundPosition?: string;
  backgroundOverlay?: string;
  buttonShadowColor?: string;
  buttonShadowIntensity?: number;
  buttonGlassOpacity?: number;
  buttonGlassBlur?: number;
  buttonNeonGlow?: string;
  buttonNeonIntensity?: number;
  buttonBorderStyle?: string;
  buttonBorderWidth?: number;
  buttonGradientDirection?: string;
  buttonGradientStart?: string;
  buttonGradientEnd?: string;
  buttonHoverTransform?: string;
  buttonHoverTransition?: string;
  buttonTextTransform?: string;
  buttonTextShadow?: string;
  backgroundSaturation?: number;
  backgroundHueRotate?: number;
  backgroundSepia?: number;
  backgroundGrayscale?: number;
  backgroundInvert?: number;
  backgroundColorFilter?: string;
  backgroundColorFilterOpacity?: number;
}

export default function UserLinkPage() {
  const { slug } = useParams();
  const [location] = useLocation();
  const [profile, setProfile] = useState<LinkProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFormId, setExpandedFormId] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        
        // Check if this is a preview request with data in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const isPreview = urlParams.get('preview') === 'true';
        const previewData = urlParams.get('data');
        
        if (isPreview && previewData) {
          try {
            // Parse the preview data from the URL
            const parsedData = JSON.parse(decodeURIComponent(previewData));
            setProfile(parsedData);
            setIsLoading(false);
            return; // Skip the API call for preview mode
          } catch (parseError) {
            console.error('Error parsing preview data:', parseError);
            // Continue with normal API request if preview data is invalid
          }
        }
        
        // Normal API request flow
        const response = await apiRequest(`/api/links/profile/${slug}`);
        
        if (response && response.data) {
          setProfile(response.data);
          
          // Record view (only in non-preview mode)
          if (!isPreview) {
            try {
              await apiRequest(`/api/links/profile/${slug}/view`, { method: 'POST' });
            } catch (viewError) {
              console.error('Error recording view:', viewError);
              // Continue even if view recording fails
            }
          }
        } else {
          setError('Profil non trouvé');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Impossible de charger le profil');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (slug || window.location.search.includes('preview=true')) {
      fetchProfile();
    }
  }, [slug, location]);
  
  const handleLinkClick = async (linkId: string, event?: React.MouseEvent) => {
    // Check if this is a preview - if so, prevent navigation and just show a message
    const urlParams = new URLSearchParams(window.location.search);
    const isPreview = urlParams.get('preview') === 'true';
    
    if (isPreview && event) {
      event.preventDefault();
      console.log('Link click in preview mode:', linkId);
      return;
    }
    
    try {
      await apiRequest(`/api/links/click/${linkId}`, { method: 'POST' });
    } catch (err) {
      console.error('Error recording click:', err);
    }
  };
  
  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ backgroundColor: '#fff', color: '#000' }}
      >
        <Skeleton className="h-24 w-24 rounded-full mb-6" />
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-8" />
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }
  
  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <Link2 className="h-16 w-16 text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Page non trouvée</h1>
        <p className="text-gray-500 mb-6">Le lien que vous avez suivi n'existe pas ou a été supprimé.</p>
        <a 
          href="/"
          className="flex items-center gap-2 text-blue-500 hover:text-blue-700 transition-colors"
        >
          <span>Retour à l'accueil</span>
        </a>
      </div>
    );
  }
  
  return (
    <div 
      className={`min-h-screen flex flex-col items-center py-12 px-4 ${profile.patternAnimation || ''} relative`}
      style={{ 
        backgroundColor: profile.backgroundColor || '#ffffff',
        color: profile.textColor || '#000000',
        backgroundImage: !profile.backgroundImage && profile.backgroundPattern 
            ? `url('/api/statics/patterns/${profile.backgroundPattern}.svg?color=${encodeURIComponent(profile.patternColor || profile.textColor || '#000000')}&opacity=${profile.patternOpacity || 0.2}&size=${profile.patternSize || 20}')`
            : undefined,
        backgroundSize: !profile.backgroundImage && profile.backgroundPattern ? `${profile.patternSize || 20}px` : undefined,
        backgroundRepeat: !profile.backgroundImage && profile.backgroundPattern ? 'repeat' : undefined,
        fontFamily: profile.fontFamily || 'Inter',
      }}
    >
      {/* Container pour l'image de fond et l'overlay */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Image d'arrière-plan avec filtres */}
        {profile.backgroundImage && (
          <div 
            className="absolute inset-0" 
            style={{ 
              backgroundImage: `url(${profile.backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: profile.backgroundPosition || 'center',
              filter: `
                blur(${profile.backgroundBlur || 0}px)
                brightness(${(profile.backgroundBrightness || 100) / 100})
                contrast(${(profile.backgroundContrast || 100) / 100})
                saturate(${(profile.backgroundSaturation || 100) / 100})
                hue-rotate(${profile.backgroundHueRotate || 0}deg)
                sepia(${(profile.backgroundSepia || 0) / 100})
                grayscale(${(profile.backgroundGrayscale || 0) / 100})
                invert(${(profile.backgroundInvert || 0) / 100})
              `
            }}
          />
        )}
        
        {/* Filtre de couleur */}
        {profile.backgroundImage && profile.backgroundColorFilter && (
          <div 
            className="absolute inset-0 pointer-events-none z-5" 
            style={{ 
              backgroundColor: profile.backgroundColorFilter,
              opacity: profile.backgroundColorFilterOpacity || 0.3
            }}
          />
        )}
        
        {/* Superposition */}
        {profile.backgroundImage && profile.backgroundOverlay && profile.backgroundOverlay !== '' && (
          <div 
            className="absolute inset-0 pointer-events-none" 
            style={{ 
              backgroundImage: profile.backgroundOverlay.includes('gradient') ? profile.backgroundOverlay : 'none',
              backgroundColor: !profile.backgroundOverlay.includes('gradient') ? profile.backgroundOverlay : 'transparent'
      }}
          />
        )}
      </div>
      
      <div className="w-full max-w-md flex flex-col items-center mb-8 relative z-10">
        <Avatar className="h-24 w-24 mb-6">
          {profile.logoUrl ? (
            <AvatarImage src={profile.logoUrl} alt={profile.title} />
          ) : (
            <AvatarFallback 
              style={{ 
                backgroundColor: profile.accentColor || '#70C7BA',
                color: '#fff'
              }}
            >
              <Link2 className="h-12 w-12" />
            </AvatarFallback>
          )}
        </Avatar>
        
        <h1 
          className="text-2xl font-bold mb-2 text-center"
          style={{ color: profile.textColor || '#000000' }}
        >
          {profile.title}
        </h1>
        
        <p 
          className="text-center mb-8"
          style={{ color: profile.textColor || '#000000' }}
        >
          {profile.description}
        </p>
      </div>
      
      <div className="w-full max-w-md space-y-4">
        {profile.links.filter(link => link.enabled)
          .sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return (a.position || 0) - (b.position || 0);
          })
          .map(link => (
            <div key={link.id}>
              {link.type === 'form' ? (
                <div
                  className={`w-full rounded-md border transition-all ${
                    profile.buttonStyle ? profile.buttonStyle : ''
                  }`}
                  style={{ 
                    borderColor: link.customColor || profile.accentColor || '#70C7BA',
                    backgroundColor: link.featured 
                      ? `${profile.accentColor || '#70C7BA'}20` 
                      : profile.buttonStyle === 'glassmorphism'
                      ? 'rgba(255, 255, 255, 0.1)'
                      : profile.buttonStyle === 'gradient'
                      ? undefined
                      : 'transparent',
                    borderRadius: profile.buttonStyle === 'pill' 
                      ? '9999px' 
                      : profile.buttonStyle === 'square'
                      ? '0'
                      : profile.buttonRadius 
                      ? `${profile.buttonRadius}px` 
                      : '8px',
                    boxShadow: profile.buttonStyle === 'shadow' 
                      ? `0 4px 6px ${profile.buttonShadowColor || 'rgba(0, 0, 0, 0.1)'}` 
                      : profile.buttonStyle === 'neon'
                      ? `0 0 10px ${link.customColor || profile.accentColor || '#70C7BA'}, 0 0 20px ${link.customColor || profile.accentColor || '#70C7BA'}50`
                      : 'none',
                    backgroundImage: profile.buttonStyle === 'gradient' 
                      ? `linear-gradient(to right, ${link.customColor || profile.accentColor || '#70C7BA'}, ${profile.backgroundColor})` 
                      : undefined,
                    borderWidth: profile.buttonStyle === 'outline' ? '2px' : '1px',
                    animation: (link.animation || profile.animation) && (link.animation || profile.animation) !== 'none' 
                      ? `${link.animation || profile.animation}Animation 0.5s ease forwards` 
                      : undefined,
                    textShadow: profile.buttonStyle === 'neon'
                      ? `0 0 5px ${link.customColor || profile.accentColor || '#70C7BA'}, 0 0 10px ${link.customColor || profile.accentColor || '#70C7BA'}`
                      : 'none',
                    backdropFilter: profile.buttonStyle === 'glassmorphism' 
                      ? `blur(${profile.buttonGlassBlur || 10}px)` 
                      : 'none',
                  }}
                >
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      setExpandedFormId(expandedFormId === link.id ? null : link.id);
                    }}
                    className={`w-full p-4 flex items-center justify-between cursor-pointer transition-all ${
                      profile.buttonStyle ? profile.buttonStyle : ''
                    }`}
                    style={{
                      color: link.customTextColor || profile.textColor || '#000000',
                      fontFamily: profile.fontFamily || 'Inter',
                      transform: profile.buttonHoverTransform || 'scale(1)',
                      transition: profile.buttonHoverTransition || 'all 0.2s ease',
                      textShadow: profile.buttonStyle === 'neon'
                        ? `0 0 5px ${link.customColor || profile.accentColor || '#70C7BA'}, 0 0 10px ${link.customColor || profile.accentColor || '#70C7BA'}`
                        : 'none',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {link.icon && (
                        <div 
                          className="rounded-full overflow-hidden flex-shrink-0"
                          style={{
                            width: `${link.iconSize ? link.iconSize * 4 : profile.iconSize ? profile.iconSize * 4 : 24}px`,
                            height: `${link.iconSize ? link.iconSize * 4 : profile.iconSize ? profile.iconSize * 4 : 24}px`
                          }}
                        >
                          <img 
                            src={link.icon} 
                            alt="" 
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <span>{link.title}</span>
                    </div>
                    {expandedFormId === link.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                  
                  {expandedFormId === link.id && (
                    <div 
                      className="p-4 border-t transition-all"
                      style={{
                      borderColor: link.customColor || profile.accentColor || '#70C7BA',
                        backgroundColor: profile.backgroundColor || '#ffffff',
                        fontFamily: profile.fontFamily || 'Inter',
                      }}
                    >
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const formData = new FormData(form);
                          const data: Record<string, string> = {};
                          formData.forEach((value, key) => {
                            data[key] = value.toString();
                          });
                          
                          try {
                            console.log('Soumission du formulaire:', {
                              url: `/api/links/form-submit/${link.id}`, 
                              data
                            });
                            
                            const response = await apiRequest(`/api/links/form-submit/${link.id}`, {
                              method: 'POST',
                              body: JSON.stringify({ data }),
                            });
                            
                            console.log('Réponse du serveur:', response);
                            
                            form.reset();
                            setExpandedFormId(null);
                            
                            alert('Formulaire envoyé avec succès !');
                          } catch (error) {
                            console.error('Erreur détaillée lors de la soumission:', error);
                            
                            if (error instanceof Error) {
                              alert(`Erreur lors de l'envoi du formulaire: ${error.message}`);
                            } else {
                              alert('Erreur lors de l\'envoi du formulaire. Veuillez réessayer.');
                            }
                          }
                        }}
                        className="space-y-4"
                      >
                        {link.formDefinition?.map((field) => (
                          <div key={field.id} className="space-y-2">
                            <label
                              htmlFor={field.id}
                              className="block text-sm font-medium"
                              style={{
                                color: link.customTextColor || profile.textColor || '#000000',
                                fontFamily: profile.fontFamily || 'Inter',
                              }}
                            >
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            
                            {field.type === 'textarea' ? (
                              <textarea
                                id={field.id}
                                name={field.id}
                                required={field.required}
                                className={`w-full p-3 rounded-md border transition-all ${
                                  profile.buttonStyle ? profile.buttonStyle : ''
                                }`}
                                style={{
                                  borderColor: link.customColor || profile.accentColor || '#70C7BA',
                                  backgroundColor: profile.buttonStyle === 'glassmorphism' 
                                    ? 'rgba(255, 255, 255, 0.1)' 
                                    : 'transparent',
                                  color: link.customTextColor || profile.textColor || '#000000',
                                  borderRadius: profile.buttonStyle === 'pill' 
                                    ? '9999px' 
                                    : profile.buttonStyle === 'square'
                                    ? '0'
                                    : profile.buttonRadius 
                                    ? `${profile.buttonRadius}px` 
                                    : '8px',
                                  boxShadow: profile.buttonStyle === 'shadow' 
                                    ? `0 4px 6px ${profile.buttonShadowColor || 'rgba(0, 0, 0, 0.1)'}` 
                                    : profile.buttonStyle === 'neon'
                                    ? `0 0 10px ${link.customColor || profile.accentColor || '#70C7BA'}, 0 0 20px ${link.customColor || profile.accentColor || '#70C7BA'}50`
                                    : 'none',
                                  borderWidth: profile.buttonStyle === 'outline' ? '2px' : '1px',
                                  backdropFilter: profile.buttonStyle === 'glassmorphism' 
                                    ? `blur(${profile.buttonGlassBlur || 10}px)` 
                                    : 'none',
                                  fontFamily: profile.fontFamily || 'Inter',
                                  textShadow: profile.buttonStyle === 'neon'
                                    ? `0 0 5px ${link.customColor || profile.accentColor || '#70C7BA'}, 0 0 10px ${link.customColor || profile.accentColor || '#70C7BA'}`
                                    : 'none',
                                }}
                                rows={4}
                              />
                            ) : field.type === 'select' ? (
                              <select
                                id={field.id}
                                name={field.id}
                                required={field.required}
                                className={`w-full p-3 rounded-md border transition-all ${
                                  profile.buttonStyle ? profile.buttonStyle : ''
                                }`}
                                style={{
                                  borderColor: link.customColor || profile.accentColor || '#70C7BA',
                                  backgroundColor: profile.buttonStyle === 'glassmorphism' 
                                    ? 'rgba(255, 255, 255, 0.1)' 
                                    : 'transparent',
                                  color: link.customTextColor || profile.textColor || '#000000',
                                  borderRadius: profile.buttonStyle === 'pill' 
                                    ? '9999px' 
                                    : profile.buttonStyle === 'square'
                                    ? '0'
                                    : profile.buttonRadius 
                                    ? `${profile.buttonRadius}px` 
                                    : '8px',
                                  boxShadow: profile.buttonStyle === 'shadow' 
                                    ? `0 4px 6px ${profile.buttonShadowColor || 'rgba(0, 0, 0, 0.1)'}` 
                                    : profile.buttonStyle === 'neon'
                                    ? `0 0 10px ${link.customColor || profile.accentColor || '#70C7BA'}, 0 0 20px ${link.customColor || profile.accentColor || '#70C7BA'}50`
                                    : 'none',
                                  borderWidth: profile.buttonStyle === 'outline' ? '2px' : '1px',
                                  backdropFilter: profile.buttonStyle === 'glassmorphism' 
                                    ? `blur(${profile.buttonGlassBlur || 10}px)` 
                                    : 'none',
                                  fontFamily: profile.fontFamily || 'Inter',
                                  textShadow: profile.buttonStyle === 'neon'
                                    ? `0 0 5px ${link.customColor || profile.accentColor || '#70C7BA'}, 0 0 10px ${link.customColor || profile.accentColor || '#70C7BA'}`
                                    : 'none',
                                }}
                              >
                                <option value="">Sélectionner...</option>
                                {field.options?.map((option, i) => (
                                  <option key={i} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            ) : field.type === 'checkbox' ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={field.id}
                                  name={field.id}
                                  required={field.required}
                                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                  style={{
                                    borderColor: link.customColor || profile.accentColor || '#70C7BA',
                                  }}
                                />
                                <span className="text-sm" style={{
                                  color: link.customTextColor || profile.textColor || '#000000',
                                  fontFamily: profile.fontFamily || 'Inter',
                                }}>Oui</span>
                              </div>
                            ) : (
                              <input
                                type={field.type}
                                id={field.id}
                                name={field.id}
                                required={field.required}
                                className={`w-full p-3 rounded-md border transition-all ${
                                  profile.buttonStyle ? profile.buttonStyle : ''
                                }`}
                                style={{
                                  borderColor: link.customColor || profile.accentColor || '#70C7BA',
                                  backgroundColor: profile.buttonStyle === 'glassmorphism' 
                                    ? 'rgba(255, 255, 255, 0.1)' 
                                    : 'transparent',
                                  color: link.customTextColor || profile.textColor || '#000000',
                                  borderRadius: profile.buttonStyle === 'pill' 
                                    ? '9999px' 
                                    : profile.buttonStyle === 'square'
                                    ? '0'
                                    : profile.buttonRadius 
                                    ? `${profile.buttonRadius}px` 
                                    : '8px',
                                  boxShadow: profile.buttonStyle === 'shadow' 
                                    ? `0 4px 6px ${profile.buttonShadowColor || 'rgba(0, 0, 0, 0.1)'}` 
                                    : profile.buttonStyle === 'neon'
                                    ? `0 0 10px ${link.customColor || profile.accentColor || '#70C7BA'}, 0 0 20px ${link.customColor || profile.accentColor || '#70C7BA'}50`
                                    : 'none',
                                  borderWidth: profile.buttonStyle === 'outline' ? '2px' : '1px',
                                  backdropFilter: profile.buttonStyle === 'glassmorphism' 
                                    ? `blur(${profile.buttonGlassBlur || 10}px)` 
                                    : 'none',
                                  fontFamily: profile.fontFamily || 'Inter',
                                  textShadow: profile.buttonStyle === 'neon'
                                    ? `0 0 5px ${link.customColor || profile.accentColor || '#70C7BA'}, 0 0 10px ${link.customColor || profile.accentColor || '#70C7BA'}`
                                    : 'none',
                                }}
                              />
                            )}
                          </div>
                        ))}
                        
                        <button
                          type="submit"
                          className={`w-full p-3 rounded-md text-center font-medium transition-all ${
                            profile.buttonStyle ? profile.buttonStyle : ''
                          }`}
                          style={{
                            backgroundColor: profile.buttonStyle === 'gradient' 
                              ? undefined 
                              : link.customColor || profile.accentColor || '#70C7BA',
                            backgroundImage: profile.buttonStyle === 'gradient' 
                              ? `linear-gradient(to right, ${link.customColor || profile.accentColor || '#70C7BA'}, ${profile.backgroundColor})` 
                              : undefined,
                            color: link.customTextColor || profile.textColor || '#000000',
                            borderRadius: profile.buttonRadius ? `${profile.buttonRadius}px` : '8px',
                            boxShadow: profile.buttonStyle === 'shadow' 
                              ? `0 4px 6px ${profile.buttonShadowColor || 'rgba(0, 0, 0, 0.1)'}` 
                              : profile.buttonStyle === 'neon'
                              ? `0 0 10px ${link.customColor || profile.accentColor || '#70C7BA'}, 0 0 20px ${link.customColor || profile.accentColor || '#70C7BA'}50`
                              : 'none',
                            borderWidth: profile.buttonStyle === 'outline' ? '2px' : '1px',
                            borderColor: link.customColor || profile.accentColor || '#70C7BA',
                            fontFamily: profile.fontFamily || 'Inter',
                            transform: profile.buttonHoverTransform || 'scale(1)',
                            transition: profile.buttonHoverTransition || 'all 0.2s ease',
                            backdropFilter: profile.buttonStyle === 'glassmorphism' 
                              ? `blur(${profile.buttonGlassBlur || 10}px)` 
                              : 'none',
                            textShadow: profile.buttonStyle === 'neon'
                              ? `0 0 5px ${link.customColor || profile.accentColor || '#70C7BA'}, 0 0 10px ${link.customColor || profile.accentColor || '#70C7BA'}`
                              : 'none',
                          }}
                        >
                          Envoyer
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ) : (
                <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => handleLinkClick(link.id, e)}
                  className={`block w-full p-4 rounded-md border text-center font-medium transition-all ${
                    profile.buttonStyle ? profile.buttonStyle : ''
                  }`}
              style={{ 
                borderColor: link.customColor || profile.accentColor || '#70C7BA',
                color: link.customTextColor || profile.textColor || '#000000',
                    backgroundColor: link.featured 
                      ? `${profile.accentColor || '#70C7BA'}20` 
                      : profile.buttonStyle === 'glassmorphism'
                      ? 'rgba(255, 255, 255, 0.1)'
                      : profile.buttonStyle === 'gradient'
                      ? undefined
                      : 'transparent',
                    borderRadius: profile.buttonStyle === 'pill' 
                      ? '9999px' 
                      : profile.buttonStyle === 'square'
                      ? '0'
                      : profile.buttonRadius 
                      ? `${profile.buttonRadius}px` 
                      : '8px',
                    boxShadow: profile.buttonStyle === 'shadow' 
                      ? `0 4px 6px ${profile.buttonShadowColor || 'rgba(0, 0, 0, 0.1)'}` 
                      : profile.buttonStyle === 'neon'
                      ? `0 0 10px ${link.customColor || profile.accentColor || '#70C7BA'}, 0 0 20px ${link.customColor || profile.accentColor || '#70C7BA'}50`
                      : 'none',
                    backgroundImage: profile.buttonStyle === 'gradient' 
                      ? `linear-gradient(to right, ${link.customColor || profile.accentColor || '#70C7BA'}, ${profile.backgroundColor})` 
                      : undefined,
                    borderWidth: profile.buttonStyle === 'outline' ? '2px' : '1px',
                    transform: profile.buttonHoverTransform || 'scale(1)',
                    transition: profile.buttonHoverTransition || 'all 0.2s ease',
                    fontFamily: profile.fontFamily || 'Inter',
                    backdropFilter: profile.buttonStyle === 'glassmorphism' 
                      ? `blur(${profile.buttonGlassBlur || 10}px)` 
                      : 'none',
                    textShadow: profile.buttonStyle === 'neon'
                      ? `0 0 5px ${link.customColor || profile.accentColor || '#70C7BA'}, 0 0 10px ${link.customColor || profile.accentColor || '#70C7BA'}`
                      : 'none',
                    animation: (link.animation || profile.animation) && (link.animation || profile.animation) !== 'none' 
                      ? `${link.animation || profile.animation}Animation 0.5s ease forwards` 
                      : undefined,
              }}
            >
              <div className="flex items-center justify-center gap-2">
                {link.icon && (
                  <div 
                        className="rounded-full overflow-hidden flex-shrink-0"
                    style={{
                          width: `${link.iconSize ? link.iconSize * 4 : profile.iconSize ? profile.iconSize * 4 : 24}px`,
                          height: `${link.iconSize ? link.iconSize * 4 : profile.iconSize ? profile.iconSize * 4 : 24}px`,
                          filter: profile.buttonStyle === 'neon'
                            ? `drop-shadow(0 0 5px ${link.customColor || profile.accentColor || '#70C7BA'})`
                            : 'none'
                    }}
                  >
                    <img 
                      src={link.icon} 
                      alt="" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <span>{link.title}</span>
                    <ExternalLink className="h-4 w-4 opacity-70" style={{
                      filter: profile.buttonStyle === 'neon'
                        ? `drop-shadow(0 0 5px ${link.customColor || profile.accentColor || '#70C7BA'})`
                        : 'none'
                    }} />
              </div>
            </a>
              )}
            </div>
          ))}
      </div>
      
      <div className="mt-12 text-sm opacity-50">
        <a 
          href="/"
          className="hover:opacity-100 transition-opacity"
          style={{ color: profile.textColor || '#000000' }}
        >
          Créé avec ImmoVault
        </a>
      </div>
      
      <style jsx global>{`
        /* Chargement des polices */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Montserrat:wght@400;500;600&family=Open+Sans:wght@400;500;600&family=Poppins:wght@400;500;600&family=Roboto:wght@400;500;700&family=Lato:wght@400;700&display=swap');
        @import url('/css/animated-patterns.css');
        
        /* Optimisation des animations */
        @keyframes fadeAnimation {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideAnimation {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes bounceAnimation {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes scaleAnimation {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        @keyframes flipAnimation {
          from { transform: perspective(400px) rotateY(90deg); opacity: 0; }
          to { transform: perspective(400px) rotateY(0deg); opacity: 1; }
        }
        
        /* Classes optimisées pour les styles de boutons */
        .button-style-shadow {
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: box-shadow 0.2s ease;
        }
        
        .button-style-neon {
          position: relative;
          overflow: hidden;
          transition: box-shadow 0.2s ease;
        }
        
        .button-style-glassmorphism {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.2s ease;
        }
        
        .button-style-gradient {
          background-size: 200% 100%;
          background-position: left center;
          transition: background-position 0.3s ease;
        }
        
        .button-style-gradient:hover {
          background-position: right center;
        }
        
        /* Classes pour les arrondis */
        .button-radius-pill {
          border-radius: 9999px;
        }
        
        .button-radius-square {
          border-radius: 0;
        }
        
        /* Classes pour les animations */
        .animation-fade {
          animation: fadeAnimation 0.5s ease forwards;
        }
        
        .animation-slide {
          animation: slideAnimation 0.5s ease forwards;
        }
        
        .animation-bounce {
          animation: bounceAnimation 0.5s ease forwards;
        }
        
        .animation-scale {
          animation: scaleAnimation 0.5s ease forwards;
        }
        
        .animation-flip {
          animation: flipAnimation 0.5s ease forwards;
        }
        
        /* Optimisation des transitions */
        .transition-transform {
          transform: translateZ(0);
          will-change: transform;
        }
        
        .transition-opacity {
          will-change: opacity;
        }
        
        /* Optimisation des effets de survol */
        .hover-scale {
          transition: transform 0.2s ease;
        }
        
        .hover-scale:hover {
          transform: scale(1.02);
        }
        
        /* Optimisation des médias queries */
        @media (max-width: 640px) {
          .button-style-glassmorphism {
            backdrop-filter: blur(5px);
          }
          
          .button-style-gradient {
          background-size: 150% 100%;
          }
        }
        
        /* Optimisation des performances */
        .performance-optimized {
          transform: translateZ(0);
          backface-visibility: hidden;
          perspective: 1000px;
        }
        
        /* Optimisation des formulaires */
        .form-input-optimized {
          transform: translateZ(0);
          will-change: transform, opacity;
        }
        
        .form-container-optimized {
          contain: content;
          will-change: transform;
        }
      `}</style>
    </div>
  );
} 