                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => handleLinkClick(e, link.id)}
                        className={cn(
                          "w-full p-3 border flex items-center justify-center transition-transform hover:scale-[1.02]",
                          link.featured ? 'border-2' : ''
                        )}
                        style={{ 
                          borderColor: link.customColor || profile.accentColor,
                          color: link.customTextColor || profile.textColor,
                          backgroundColor: link.featured ? `${profile.accentColor}20` : undefined,
                          borderRadius: profile.buttonStyle === 'pill' ? '9999px' : `${profile.buttonRadius}px`,
                          boxShadow: profile.buttonStyle === 'shadow' ? '0 4px 6px rgba(0, 0, 0, 0.1)' : 'none',
                          backgroundImage: profile.buttonStyle === 'gradient' 
                            ? `linear-gradient(to right, ${profile.accentColor}90, ${profile.backgroundColor})` 
                            : undefined,
                          borderWidth: profile.buttonStyle === 'outline' ? '2px' : '1px',
                          animation: (link.animation || profile.animation) && (link.animation || profile.animation) !== 'none' 
                            ? `${link.animation || profile.animation}Animation 0.5s ease forwards` 
                            : undefined
                        }}
                      >
                        <div className="flex items-center justify-center gap-2 w-full">
                          {link.icon && (
                            <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0 mr-2">
                              <img 
                                src={link.icon} 
                                alt={link.title} 
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <span>{link.title}</span>
                          <ExternalLink className="h-3 w-3 opacity-70 ml-auto" />
                        </div>
                      </a> 