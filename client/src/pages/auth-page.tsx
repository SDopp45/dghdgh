import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthAnimation } from "@/components/ui/auth-animation";
import { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { Building, Home, Key, Lock, Mail, Phone, User, UserPlus, Users } from "lucide-react";

// Rest of the imports remain unchanged...

type TabValue = "login" | "register";

const formSchema = z.object({
  username: z.string().min(3, "Le nom d'utilisateur doit contenir au moins 3 caractères").max(20),
  fullName: z.string().min(2, "Le nom complet doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  phoneNumber: z.string()
    .regex(/^(\+33|0)[1-9](\d{8}|\s\d{2}\s\d{2}\s\d{2}\s\d{2})$/, "Numéro de téléphone invalide")
    .optional()
    .or(z.literal('')),
  company: z.string().optional(),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

const loginSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
});

// Composant bâtiment 3D
const Building3D = ({ x, y, delay, size = 1, color = "#0ED3CF" }) => {
  return (
    <motion.div
      className="absolute"
      style={{ 
        originX: 0.5, 
        originY: 0.5,
        opacity: 0.5,
        filter: `blur(1px) drop-shadow(0 0 10px ${color})`
      }}
      initial={{ 
        x, 
        y, 
        scale: 0, 
        opacity: 0 
      }}
      animate={{ 
        scale: size, 
        opacity: 0.4,
        rotateY: [0, 180, 360],
        rotateX: [0, 20, 0, -20, 0], 
      }}
      transition={{ 
        delay,
        duration: 25, 
        repeat: Infinity, 
        ease: "easeInOut",
        times: [0, 0.2, 0.5, 0.8, 1]
      }}
    >
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 5L5 20V55H55V20L30 5Z" stroke={color} strokeWidth="2" fill="none" />
        <path d="M20 55V30H40V55" stroke={color} strokeWidth="2" fill="none" />
        <path d="M30 5V20" stroke={color} strokeWidth="2" fill="none" />
        <path d="M5 20H55" stroke={color} strokeWidth="2" fill="none" />
        <path d="M30 55V45H25V55" stroke={color} strokeWidth="2" fill="none" />
      </svg>
    </motion.div>
  );
};

// Composant réseau de connexions IA
const AINetworkNode = ({ x, y, size = 3, delay = 0, color = "#0ED3CF", type = "default" }) => {
  const pulseDelay = useRef(Math.random() * 8);
  
  // Icônes immobilières pour les nœuds
  const renderIcon = () => {
    switch(type) {
      case "property": 
        return (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" opacity="0.8">
            <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6" />
          </svg>
        );
      case "tenant": 
        return (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" opacity="0.8">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
          </svg>
        );
      case "document": 
        return (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" opacity="0.8">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 8V2l6 6h-6zM16 13H8M16 17H8M10 9H8" />
          </svg>
        );
      case "key": 
        return (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" opacity="0.8">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        );
      case "finance": 
        return (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" opacity="0.8">
            <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        );
      default:
        return null;
    }
  };
  
  return (
    <motion.div
      className="absolute rounded-full flex items-center justify-center"
      style={{ 
        x, 
        y, 
        width: size * 3, 
        height: size * 3,
        background: color,
        boxShadow: `0 0 10px ${color}`,
      }}
      initial={{ opacity: 0.2, scale: 0.8 }}
      animate={{ 
        opacity: [0.4, 0.6, 0.4],
        scale: [0.95, 1.05, 0.95],
      }}
      transition={{ 
        duration: 8 + Math.random() * 4,
        repeat: Infinity,
        delay: pulseDelay.current,
        ease: "easeInOut",
        times: [0, 0.5, 1],
      }}
    >
      {renderIcon()}
    </motion.div>
  );
};

// Lignes de connexion entre les noeuds avec données immobilières
const AINetworkLine = ({ startX, startY, endX, endY, delay = 0, duration = 2, color = "#0ED3CF", data }) => {
  const showData = useRef(Math.random() > 0.7);
  const dataPosition = useRef(Math.random());
  
  // Calcul distance et position
  const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
  const midX = startX + (endX - startX) * dataPosition.current;
  const midY = startY + (endY - startY) * dataPosition.current;
  
  // Durée ajustée en fonction de la distance pour un effet cohérent
  const adjustedDuration = Math.max(3, distance / 100 * 3);
  
  return (
    <>
      <motion.div
        className="absolute origin-left"
        style={{
          left: startX,
          top: startY,
          height: 1.2,
          background: `linear-gradient(90deg, ${color}00, ${color}, ${color}00)`,
          transformOrigin: "left",
        }}
        initial={{
          width: 0,
          rotate: angle,
        }}
        animate={{
          width: distance,
          opacity: [0, 0.4, 0],
        }}
        transition={{
          duration: adjustedDuration,
          delay,
          repeat: Infinity,
          repeatDelay: Math.random() * 8 + 4,
          ease: "easeInOut",
        }}
      />
      
      {/* Particules voyageant sur la ligne de connexion */}
      <motion.div
        className="absolute w-1.5 h-1.5 rounded-full"
        style={{
          background: color,
          boxShadow: `0 0 5px ${color}`,
          left: startX,
          top: startY,
          zIndex: 1,
        }}
        animate={{
          x: [0, endX - startX],
          y: [0, endY - startY]
        }}
        transition={{
          duration: adjustedDuration * 1.5,
          delay: delay + 0.5,
          repeat: Infinity,
          repeatDelay: Math.random() * 6 + 6,
          ease: "easeInOut"
        }}
      />
      
      {/* Affichage des données immobilières sur certaines connexions */}
      {showData.current && (
        <motion.div
          className="absolute text-xs text-cyan-100 dark:text-cyan-300 bg-slate-800/30 dark:bg-slate-900/40 backdrop-blur-sm px-1.5 py-0.5 rounded whitespace-nowrap"
          style={{
            left: midX,
            top: midY,
            transform: 'translate(-50%, -50%)',
            fontSize: '8px',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(14, 211, 207, 0.1)',
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: [0, 0.8, 0],
            scale: [0.9, 1, 0.9],
          }}
          transition={{
            duration: 8,
            delay: delay + 3,
            repeat: Infinity,
            repeatDelay: Math.random() * 12 + 10,
            ease: "easeInOut"
          }}
        >
          {data}
        </motion.div>
      )}
    </>
  );
};

// Composant de fond immobilier 3D avec réseau IA
const ImmobilierAIBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  
  // Données immobilières fictives pour les connexions
  const immoDatas = [
    "Loyer: 950€",
    "Surface: 72m²",
    "Contrat: #DR3821",
    "Caution: 1800€",
    "Échéance: 05/09/2023",
    "Propriété: T3 Marseille", 
    "Charges: 120€/mois",
    "Documents: 5",
    "État: Excellent",
    "Note: 4.8/5"
  ];
  
  // Types de nœuds immobiliers
  const nodeTypes = ["property", "tenant", "document", "key", "finance", "default"];
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    const handleResize = () => {
      setDimensions({ 
        width: window.innerWidth, 
        height: window.innerHeight 
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    handleResize();
    
    // Initialiser les noeuds immobiliers intelligents
    const nodeCount = 20;
    const newNodes = Array.from({ length: nodeCount }).map((_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 2 + 1.5,
      type: nodeTypes[Math.floor(Math.random() * nodeTypes.length)]
    }));
    setNodes(newNodes);
    
    // Créer des connexions entre les noeuds avec données immobilières
    const newConnections = [];
    for (let i = 0; i < nodeCount; i++) {
      const connectionCount = Math.floor(Math.random() * 2) + 1;
      for (let j = 0; j < connectionCount; j++) {
        // Connecter de préférence des nœuds de types différents pour symboliser les relations
        let target;
        do {
          target = Math.floor(Math.random() * nodeCount);
        } while (target === i);
        
        // Sélectionner une donnée immobilière pertinente
        const data = immoDatas[Math.floor(Math.random() * immoDatas.length)];
        
        newConnections.push({
          id: `${i}-${target}`,
          start: i,
          end: target,
          duration: Math.random() * 2 + 4,
          delay: Math.random() * 3,
          data: data
        });
      }
    }
    setConnections(newConnections);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  return (
    <div className="fixed inset-0 overflow-hidden z-0 bg-gradient-to-br from-slate-100 to-cyan-50 dark:from-slate-900 dark:to-cyan-950">
      {/* Cercle qui suit la souris */}
      <motion.div 
        className="absolute w-[500px] h-[500px] rounded-full bg-gradient-radial from-cyan-300/10 to-transparent dark:from-cyan-500/10 pointer-events-none"
        animate={{
          x: mousePosition.x - 250,
          y: mousePosition.y - 250,
        }}
        transition={{
          type: "spring",
          damping: 30,
          stiffness: 100,
          mass: 0.5
        }}
      />
      
      {/* Motif de grille */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-5 dark:opacity-10" />
      
      {/* Bâtiments 3D */}
      <Building3D x={dimensions.width * 0.2} y={dimensions.height * 0.3} delay={0} size={1.2} color="#0ED3CF" />
      <Building3D x={dimensions.width * 0.8} y={dimensions.height * 0.7} delay={0.5} size={0.8} color="#12B8D5" />
      <Building3D x={dimensions.width * 0.7} y={dimensions.height * 0.2} delay={1} size={1} color="#0F9DE8" />
      <Building3D x={dimensions.width * 0.3} y={dimensions.height * 0.8} delay={1.5} size={0.9} color="#0ED3CF" />
      <Building3D x={dimensions.width * 0.5} y={dimensions.height * 0.5} delay={2} size={1.1} color="#00F5E8" />
      
      {/* Effets de lumière pour symboliser l'IA */}
      <motion.div
        className="absolute w-[150px] h-[150px] rounded-full opacity-10"
        style={{ 
          background: 'radial-gradient(circle, rgba(14, 211, 207, 0.3) 0%, rgba(14, 211, 207, 0) 70%)',
          x: dimensions.width * 0.15 - 75,
          y: dimensions.height * 0.15 - 75
        }}
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{ 
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div
        className="absolute w-[200px] h-[200px] rounded-full opacity-10"
        style={{ 
          background: 'radial-gradient(circle, rgba(14, 211, 207, 0.3) 0%, rgba(14, 211, 207, 0) 70%)',
          x: dimensions.width * 0.75 - 100,
          y: dimensions.height * 0.85 - 100
        }}
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{ 
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
      />
      
      {/* Réseau de noeuds IA - Immobilier */}
      {nodes.map((node) => (
        <AINetworkNode 
          key={node.id} 
          x={node.x} 
          y={node.y} 
          size={node.size} 
          delay={node.id * 0.1}
          color={node.id % 2 === 0 ? "#0ED3CF" : "#12B8D5"}
          type={node.type}
        />
      ))}
      
      {/* Connexions entre les noeuds avec données immobilières */}
      {connections.map((connection) => {
        const start = nodes[connection.start];
        const end = nodes[connection.end];
        return (
          <AINetworkLine 
            key={connection.id}
            startX={start.x}
            startY={start.y}
            endX={end.x}
            endY={end.y}
            delay={connection.delay}
            duration={connection.duration}
            color={start.id % 2 === 0 ? "#0ED3CF" : "#12B8D5"}
            data={connection.data}
          />
        );
      })}
    </div>
  );
};

export default function AuthPage() {
  const { login, register } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [authState, setAuthState] = useState<{
    isLoading: boolean;
    message: string;
  }>({
    isLoading: false,
    message: "",
  });

  const [activeTab, setActiveTab] = useState<TabValue>("login");

  const registerForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      phoneNumber: "",
      company: "",
      password: "",
      confirmPassword: "",
    },
  });

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmitRegister = async (values: FormData) => {
    setAuthState({
      isLoading: true,
      message: "Création de votre compte...",
    });

    try {
      const result = await register({
        username: values.username,
        password: values.password,
        fullName: values.fullName,
        email: values.email,
        phoneNumber: values.phoneNumber || undefined,
        company: values.company || undefined,
      });

      if (!result.ok) {
        toast({
          title: "Erreur",
          description: result.error,
          variant: "destructive",
        });
        setAuthState({ isLoading: false, message: "" });
        return;
      }

      toast({
        title: "Succès",
        description: "Compte créé avec succès",
      });
      setLocation("/tenants"); // Redirect to tenants page after successful registration
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setAuthState({ isLoading: false, message: "" });
    }
  };

  const onSubmitLogin = async (values: z.infer<typeof loginSchema>) => {
    setAuthState({
      isLoading: true,
      message: "Connexion en cours...",
    });

    try {
      const result = await login(values);
      if (!result.ok) {
        toast({
          title: "Erreur",
          description: result.error,
          variant: "destructive",
        });
        setAuthState({ isLoading: false, message: "" });
        return;
      }
      toast({
        title: "Succès",
        description: "Bienvenue !",
      });
      setLocation("/tenants"); // Redirect to tenants page after successful login
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
      setAuthState({ isLoading: false, message: "" });
    }
  };

  // Rotation de carte au survol
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { damping: 15, stiffness: 150 };
  const rotateX = useSpring(useTransform(y, [-100, 100], [10, -10]), springConfig);
  const rotateY = useSpring(useTransform(x, [-100, 100], [-10, 10]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = (mouseX / width - 0.5) * 2;
    const yPct = (mouseY / height - 0.5) * 2;
    x.set(xPct * 50);
    y.set(yPct * 50);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      {/* Fond interactif */}
      <ImmobilierAIBackground />
      
      {/* Animation de chargement */}
      <AuthAnimation
        isVisible={authState.isLoading}
        onAnimationComplete={() => {}}
        message={authState.message}
      />
      
      {/* Contenu principal */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle className="bg-white/70 dark:bg-transparent shadow-md dark:shadow-none border border-gray-200 dark:border-transparent" />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 max-w-md w-full px-4"
      >
        {/* Logo et titre */}
        <motion.div 
          className="flex flex-col items-center mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.div 
            className="w-32 h-32 mb-0 -mb-4"
            whileHover={{ scale: 1.05 }}
            animate={{ 
              scale: [1, 1.015, 1], 
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 6,
              times: [0, 0.15, 1],
              ease: "easeInOut" 
            }}
          >
            <img 
              src="/images/logos/Logo.svg" 
              alt="ImmoVault Logo" 
              className="w-full h-full object-contain filter drop-shadow-[0_0_1px_rgba(0,0,0,0.2)] dark:drop-shadow-[0_0_2px_rgba(255,255,255,0.5)] brightness-100 dark:brightness-0 dark:invert" 
            />
          </motion.div>
          <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-cyan-500 to-teal-500 dark:from-cyan-400 dark:to-teal-400 bg-clip-text text-transparent tracking-tight">
            ImmoVault
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Système de gestion immobilière intelligent
          </p>
          
          {/* Animation de texte IA */}
          <div className="flex mt-2 text-xs text-center space-x-1 text-cyan-600 dark:text-cyan-400">
            <span>Propulsé par</span>
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="font-semibold"
            >
              Intelligence Artificielle
            </motion.span>
          </div>
        </motion.div>
        
        {/* Carte avec effet 3D */}
        <motion.div
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-cyan-100 dark:border-cyan-900/20 shadow-xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-200/20 to-teal-200/20 dark:from-cyan-900/20 dark:to-teal-900/20 pointer-events-none" />
            
            {/* Effet de lumière qui se déplace */}
            <motion.div 
              className="absolute w-full h-20 bg-gradient-to-r from-transparent via-cyan-300/10 to-transparent pointer-events-none"
              initial={{ top: -20, opacity: 0 }}
              animate={{ top: "100%", opacity: 1 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatDelay: 5
              }}
            />
            
            <CardHeader className="relative z-10 pb-6">
              <CardTitle className="text-2xl text-center font-bold">
                {activeTab === "login" ? "Connexion" : "Créer un compte"}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="relative z-10">
              <Tabs 
                value={activeTab} 
                onValueChange={(value) => setActiveTab(value as TabValue)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" className="flex items-center gap-2 data-[state=active]:bg-cyan-50 dark:data-[state=active]:bg-cyan-900/30">
                    <User className="h-4 w-4" />
                    <span>Connexion</span>
                  </TabsTrigger>
                  <TabsTrigger value="register" className="flex items-center gap-2 data-[state=active]:bg-cyan-50 dark:data-[state=active]:bg-cyan-900/30">
                    <UserPlus className="h-4 w-4" />
                    <span>Inscription</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onSubmitLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Nom d'utilisateur</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input {...field} className="pl-10 bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900/30 focus-visible:ring-cyan-500" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Mot de passe</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  type="password" 
                                  {...field} 
                                  className="pl-10 bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900/30 focus-visible:ring-cyan-500" 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <motion.div 
                        className="pt-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button 
                          type="submit" 
                          className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white shadow-md" 
                          disabled={authState.isLoading}
                        >
                          <motion.span 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2"
                          >
                            <Key className="h-4 w-4" />
                            Connexion
                          </motion.span>
                        </Button>
                      </motion.div>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="register" className="mt-0">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onSubmitRegister)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Nom d'utilisateur</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input {...field} className="pl-10 bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900/30 focus-visible:ring-cyan-500" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Nom complet</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input {...field} className="pl-10 bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900/30 focus-visible:ring-cyan-500" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  type="email" 
                                  {...field} 
                                  className="pl-10 bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900/30 focus-visible:ring-cyan-500" 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Téléphone (optionnel)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  {...field} 
                                  placeholder="+33 6 12 34 56 78" 
                                  className="pl-10 bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900/30 focus-visible:ring-cyan-500" 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Entreprise (optionnel)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                  {...field} 
                                  className="pl-10 bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900/30 focus-visible:ring-cyan-500" 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Mot de passe</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    type="password" 
                                    {...field} 
                                    className="pl-10 bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900/30 focus-visible:ring-cyan-500" 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Confirmer</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    type="password" 
                                    {...field} 
                                    className="pl-10 bg-cyan-50/50 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900/30 focus-visible:ring-cyan-500" 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <motion.div 
                        className="pt-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button 
                          type="submit" 
                          className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white shadow-md" 
                          disabled={authState.isLoading}
                        >
                          <motion.span 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2"
                          >
                            <Home className="h-4 w-4" />
                            S'inscrire
                          </motion.span>
                        </Button>
                      </motion.div>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}