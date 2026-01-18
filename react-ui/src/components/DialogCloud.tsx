import { motion, AnimatePresence } from "framer-motion";
import styles from "../css/DialogCloud.module.css";
import Font from "react-font";

interface DialogCloudProps {
  isOpen: boolean;
  text: string;
  isPopping?: boolean;
}


export default function DialogCloud({ isOpen, text, isPopping }: DialogCloudProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.cloud}
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: isPopping
              ? [1, 0.92, 1.1, 1.35, 1.35]
              : 1,
          }}
          exit={{ opacity: 0, scale: 0.85, y: 12 }}
          transition={{
            duration: isPopping ? 0.45 : 0.3,
            ease: isPopping ? "easeInOut" : "easeOut",
          }}
        >
            <Font family="Kode Mono">{text}</Font>
          <span className={styles.tail} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
