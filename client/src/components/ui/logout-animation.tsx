import { motion, AnimatePresence } from "framer-motion";

interface LogoutAnimationProps {
  isVisible: boolean;
  onAnimationComplete: () => void;
}

export function LogoutAnimation({ isVisible, onAnimationComplete }: LogoutAnimationProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: { duration: 0.3 }
          }}
          exit={{ opacity: 0 }}
          onAnimationComplete={onAnimationComplete}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <div className="relative flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                duration: 0.5
              }}
              className="flex flex-col items-center"
            >
              <div className="relative h-16 w-16">
                <motion.div
                  animate={{
                    rotate: 360
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent"
                />
              </div>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-4 text-lg font-medium text-foreground"
              >
                Déconnexion en cours...
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}