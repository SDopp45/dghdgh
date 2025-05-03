import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { LinkProfile } from '@shared/types';

const PublicProfile: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<LinkProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFormId, setExpandedFormId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`/api/links/profile/${slug}`);
        setProfile(response.data.data);
      } catch (err) {
        setError('Profil non trouvé');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchProfile();
    }
  }, [slug]);

  const handleLinkClick = async (link: any) => {
    if (link.type === 'form') {
      setExpandedFormId(expandedFormId === link.id ? null : link.id);
    } else {
      // Record click for regular links
      try {
        await axios.post(`/api/links/click/${link.id}`);
      } catch (error) {
        console.error('Error recording click:', error);
      }
    }
  };

  const handleFormChange = (linkId: string, fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [linkId]: {
        ...(prev[linkId] || {}),
        [fieldId]: value
      }
    }));
  };

  const handleFormSubmit = async (linkId: string, e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await axios.post(`/api/links/form-submit/${linkId}`, {
        data: formData[linkId] || {}
      });
      
      // Reset form after submission
      setFormData(prev => ({
        ...prev,
        [linkId]: {}
      }));
      
      // Close form
      setExpandedFormId(null);
      
      // Show success message
      alert('Formulaire envoyé avec succès!');
      
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Erreur lors de l\'envoi du formulaire');
    }
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (error || !profile) {
    return <div>{error || 'Profil non trouvé'}</div>;
  }

  return (
    <div 
      className="min-h-screen p-4"
      style={{
        backgroundColor: profile.backgroundColor,
        color: profile.textColor
      }}
    >
      <div className="max-w-2xl mx-auto">
        {profile.logoUrl && (
          <img 
            src={profile.logoUrl} 
            alt="Logo" 
            className="w-24 h-24 mx-auto mb-4 rounded-full"
          />
        )}
        
        <h1 className="text-3xl font-bold text-center mb-2">{profile.title}</h1>
        {profile.description && (
          <p className="text-center mb-8">{profile.description}</p>
        )}

        <div className="space-y-4">
          {profile.links?.map((link) => (
            <div key={link.id}>
              {link.type === 'form' ? (
                <div className="mb-4">
                  <button
                    onClick={() => handleLinkClick(link)}
                    className="block w-full p-4 rounded-lg text-center transition-all hover:opacity-90"
                    style={{
                      backgroundColor: profile.accentColor,
                      color: profile.textColor
                    }}
                  >
                    {link.title}
                  </button>
                  
                  {expandedFormId === link.id && (
                    <div className="mt-4 p-4 bg-white rounded-lg shadow-md">
                      <form onSubmit={(e) => handleFormSubmit(link.id, e)}>
                        {link.formDefinition?.map((field) => (
                          <div key={field.id} className="mb-4">
                            <label 
                              htmlFor={`${link.id}-${field.id}`} 
                              className="block mb-2 text-sm font-medium"
                            >
                              {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            
                            {field.type === 'text' && (
                              <input
                                id={`${link.id}-${field.id}`}
                                type="text"
                                required={field.required}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                value={formData[link.id]?.[field.id] || ''}
                                onChange={(e) => handleFormChange(link.id, field.id, e.target.value)}
                              />
                            )}
                            
                            {field.type === 'textarea' && (
                              <textarea
                                id={`${link.id}-${field.id}`}
                                required={field.required}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                value={formData[link.id]?.[field.id] || ''}
                                onChange={(e) => handleFormChange(link.id, field.id, e.target.value)}
                              />
                            )}
                            
                            {field.type === 'email' && (
                              <input
                                id={`${link.id}-${field.id}`}
                                type="email"
                                required={field.required}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                value={formData[link.id]?.[field.id] || ''}
                                onChange={(e) => handleFormChange(link.id, field.id, e.target.value)}
                              />
                            )}
                            
                            {field.type === 'checkbox' && (
                              <input
                                id={`${link.id}-${field.id}`}
                                type="checkbox"
                                required={field.required}
                                className="mr-2"
                                checked={formData[link.id]?.[field.id] || false}
                                onChange={(e) => handleFormChange(link.id, field.id, e.target.checked)}
                              />
                            )}
                            
                            {field.type === 'select' && (
                              <select
                                id={`${link.id}-${field.id}`}
                                required={field.required}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                value={formData[link.id]?.[field.id] || ''}
                                onChange={(e) => handleFormChange(link.id, field.id, e.target.value)}
                              >
                                <option value="">Sélectionner...</option>
                                {field.options?.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        ))}
                        
                        <button
                          type="submit"
                          className="w-full p-3 mt-4 text-white bg-blue-600 rounded-md hover:bg-blue-700"
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
                  className="block p-4 rounded-lg text-center transition-all hover:opacity-90"
                  style={{
                    backgroundColor: profile.accentColor,
                    color: profile.textColor
                  }}
                  onClick={() => handleLinkClick(link)}
                >
                  {link.title}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PublicProfile; 