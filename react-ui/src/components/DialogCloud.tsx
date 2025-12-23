import { motion, AnimatePresence } from "framer-motion";
import styles from "../css/DialogCloud.module.css";
import Font from "react-font";

interface DialogCloudProps {
  isOpen: boolean;
  text: string;
}

export default function DialogCloud({ isOpen, text }: DialogCloudProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.cloud}
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
            <Font family="Kode Mono">{text}</Font>
          <span className={styles.tail} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
