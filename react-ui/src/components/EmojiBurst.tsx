import { motion } from "framer-motion";

const emojis = ["💥", "🤯", "💪​", "❤️", "🏃‍♂️​", "🔥", "🏋🏻‍♂️"];

export default function EmojiBurst() {
  return (
    <div
      style={{
        position: "absolute",
        left: "0%",
        bottom: "100%",
        pointerEvents: "none",
      }}
    >
      {emojis.map((emoji, i) => {
        const angle = (Math.PI * 2 * i) / emojis.length;
        const distance = 60 + Math.random() * 30;

        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
            animate={{
              opacity: [0, 1, 0],
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * -distance,
              scale: [0.5, 2.5, 0.8],
              rotate: Math.random() * 360,
            }}
            transition={{
              duration: 1.5,
              ease: "easeOut",
            }}
            style={{
              position: "absolute",
              fontSize: "1.5rem",
            }}
          >
            {emoji}
          </motion.span>
        );
      })}
    </div>
  );
}
