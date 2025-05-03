import { motion, AnimatePresence } from "framer-motion";

interface SuccessAnimationProps {
  isVisible: boolean;
  onAnimationComplete: () => void;
  message?: string;
}

export function SuccessAnimation({ isVisible, onAnimationComplete, message }: SuccessAnimationProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onAnimationComplete={onAnimationComplete}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex flex-col items-center gap-4 p-6 bg-card rounded-lg shadow-lg"
          >
            <div className="relative w-16 h-16">
              <motion.div
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: 1,
                  transition: { duration: 0.5, delay: 0.2 }
                }}
                className="absolute inset-0"
              >
                <svg
                  className="w-full h-full"
                  viewBox="0 0 50 50"
                >
                  <motion.path
                    fill="none"
                    strokeWidth="3"
                    stroke="currentColor"
                    className="text-primary"
                    d="M14,26 L 22,33 L 36,16"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            </div>
            {message && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-lg font-medium text-foreground text-center"
              >
                {message}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
