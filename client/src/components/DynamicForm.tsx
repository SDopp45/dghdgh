import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Types pour les champs de formulaire
type FormFieldType = 'text' | 'textarea' | 'email' | 'number' | 'checkbox' | 'select';

interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options?: string[];
}

interface DynamicFormProps {
  formId: string | number;
  fields: FormField[];
  slug?: string;
  clientId?: string;
  onSuccess?: (response: any) => void;
  onError?: (error: Error) => void;
  buttonText?: string;
  className?: string;
  styleVariant?: 'default' | 'clean' | 'glass' | 'neon' | 'gradient';
  primaryColor?: string;
  textColor?: string;
}

const DynamicForm: React.FC<DynamicFormProps> = ({
  formId,
  fields,
  slug,
  clientId,
  onSuccess,
  onError,
  buttonText = 'Envoyer',
  className = '',
  styleVariant = 'default',
  primaryColor = '#70C7BA',
  textColor = '#000000'
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Construire le schéma de validation Zod dynamiquement à partir des fields
  const generateValidationSchema = () => {
    const schema: Record<string, any> = {};
    
    fields.forEach((field) => {
      let fieldSchema: any;
      
      switch (field.type) {
        case 'email':
          fieldSchema = z.string().email('Email invalide');
          break;
        case 'number':
          fieldSchema = z.string().refine((val) => !isNaN(Number(val)), {
            message: 'Doit être un nombre valide',
          });
          break;
        case 'checkbox':
          fieldSchema = z.boolean();
          break;
        case 'textarea':
        case 'text':
        case 'select':
        default:
          fieldSchema = z.string();
          break;
      }
      
      // Ajouter la validation required si nécessaire
      if (field.required) {
        if (field.type === 'checkbox') {
          fieldSchema = fieldSchema.refine((val: boolean) => val === true, {
            message: 'Ce champ est requis',
          });
        } else {
          fieldSchema = fieldSchema.min(1, 'Ce champ est requis');
        }
      } else {
        // Si non requis, rendre optionnel
        if (field.type !== 'checkbox') {
          fieldSchema = fieldSchema.optional();
        }
      }
      
      schema[field.id] = fieldSchema;
    });
    
    return z.object(schema);
  };
  
  const validationSchema = generateValidationSchema();
  
  // Configurer react-hook-form avec le schéma
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(validationSchema),
  });
  
  // Gérer la soumission du formulaire
  const onSubmit = async (data: Record<string, any>) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      
      // URL de l'API avec les paramètres nécessaires
      let apiUrl = `/api/forms/${formId}/submit`;
      if (slug) {
        apiUrl += `?slug=${encodeURIComponent(slug)}`;
      }
      
      console.log('Soumission du formulaire à:', apiUrl);
      
      // Headers pour l'API
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Ajouter l'ID client si disponible
      if (clientId) {
        headers['X-Client-ID'] = clientId;
      }
      
      // Appeler l'API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ data }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur API:', response.status, errorText);
        throw new Error(`Erreur ${response.status}: ${errorText || 'Erreur lors de la soumission du formulaire'}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Erreur lors de la soumission du formulaire');
      }
      
      console.log('Soumission réussie:', result);
      
      // Réinitialiser le formulaire et afficher le succès
      reset();
      setSubmitSuccess(true);
      
      // Appeler le callback de succès si fourni
      if (onSuccess) {
        onSuccess(result);
      }
      
      // Masquer le message de succès après un délai
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);
      
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitError(error instanceof Error ? error.message : 'Erreur lors de la soumission');
      
      // Appeler le callback d'erreur si fourni
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Styles des boutons selon la variante
  const getButtonStyles = () => {
    const baseStyle = {
      backgroundColor: primaryColor,
      color: textColor === '#000000' ? '#FFFFFF' : textColor,
      borderRadius: '8px',
      padding: '10px 16px',
      fontWeight: 'bold',
      border: 'none',
      cursor: 'pointer',
      width: '100%',
      marginTop: '16px',
      transition: 'all 0.2s ease',
    };
    
    switch (styleVariant) {
      case 'clean':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          border: `2px solid ${primaryColor}`,
          color: primaryColor,
        };
      case 'glass':
        return {
          ...baseStyle,
          backgroundColor: `${primaryColor}44`,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        };
      case 'neon':
        return {
          ...baseStyle,
          boxShadow: `0 0 10px ${primaryColor}, 0 0 20px ${primaryColor}50`,
          textShadow: `0 0 5px ${primaryColor}`,
        };
      case 'gradient':
        return {
          ...baseStyle,
          backgroundImage: `linear-gradient(45deg, ${primaryColor}, ${primaryColor}99)`,
        };
      default:
        return baseStyle;
    }
  };
  
  return (
    <form 
      onSubmit={handleSubmit(onSubmit)} 
      className={`dynamic-form ${className}`}
      style={{ fontFamily: 'inherit' }}
      noValidate
    >
      {submitSuccess && (
        <div
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          Le formulaire a été envoyé avec succès !
        </div>
      )}
      
      {submitError && (
        <div
          style={{
            backgroundColor: '#F44336',
            color: 'white',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          {submitError}
        </div>
      )}
      
      {fields.map((field) => (
        <div
          key={field.id}
          style={{ marginBottom: '16px' }}
        >
          <label
            htmlFor={field.id}
            style={{
              display: field.type === 'checkbox' ? 'flex' : 'block',
              alignItems: field.type === 'checkbox' ? 'center' : 'flex-start',
              marginBottom: field.type === 'checkbox' ? '0' : '8px',
              fontWeight: 500,
              color: textColor,
            }}
          >
            {field.type === 'checkbox' ? (
              <>
                <input
                  type="checkbox"
                  id={field.id}
                  {...register(field.id)}
                  style={{
                    marginRight: '8px',
                    accentColor: primaryColor,
                  }}
                />
                <span>{field.label}{field.required && <span style={{ color: '#F44336' }}> *</span>}</span>
              </>
            ) : (
              <>
                {field.label}
                {field.required && <span style={{ color: '#F44336' }}> *</span>}
              </>
            )}
          </label>
          
          {field.type !== 'checkbox' && (
            <>
              {field.type === 'textarea' ? (
                <textarea
                  id={field.id}
                  {...register(field.id)}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors[field.id] ? '#F44336' : '#E0E0E0'}`,
                    backgroundColor: 'transparent',
                    color: textColor,
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                  }}
                  placeholder={field.label}
                  aria-invalid={errors[field.id] ? 'true' : 'false'}
                />
              ) : field.type === 'select' && field.options ? (
                <select
                  id={field.id}
                  {...register(field.id)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors[field.id] ? '#F44336' : '#E0E0E0'}`,
                    backgroundColor: 'transparent',
                    color: textColor,
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                  }}
                  aria-invalid={errors[field.id] ? 'true' : 'false'}
                >
                  <option value="">Sélectionner une option</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
                  id={field.id}
                  {...register(field.id)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${errors[field.id] ? '#F44336' : '#E0E0E0'}`,
                    backgroundColor: 'transparent',
                    color: textColor,
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                  }}
                  placeholder={field.label}
                  aria-invalid={errors[field.id] ? 'true' : 'false'}
                />
              )}
            </>
          )}
          
          {errors[field.id] && (
            <p
              style={{
                color: '#F44336',
                fontSize: '0.875rem',
                marginTop: '4px',
                marginBottom: '0',
              }}
            >
              {errors[field.id]?.message as string}
            </p>
          )}
        </div>
      ))}
      
      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          ...getButtonStyles(),
          opacity: isSubmitting ? 0.7 : 1,
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
        }}
      >
        {isSubmitting ? 'Envoi en cours...' : buttonText}
      </button>
    </form>
  );
};

export default DynamicForm; 