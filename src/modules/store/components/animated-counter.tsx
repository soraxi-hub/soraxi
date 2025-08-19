"use client";

import { motion, useAnimation } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useEffect, useState } from "react";

export const AnimatedCounter = ({
  target,
  sign = "+",
  className,
}: {
  target: number;
  sign?: string;
  className?: string;
}) => {
  const controls = useAnimation();
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView({ triggerOnce: true });

  useEffect(() => {
    if (inView) {
      controls.start("visible");
      let start = 0;
      const duration = 2000;
      const increment = target / (duration / 10);
      const counter = setInterval(() => {
        start += increment;
        if (start >= target) {
          setCount(target);
          clearInterval(counter);
        } else {
          setCount(Math.floor(start));
        }
      }, 10);
    }
  }, [inView, controls, target]);

  return (
    <motion.h3
      ref={ref}
      className={`text-4xl font-bold ${className}`}
      initial={{ opacity: 0 }}
      animate={controls}
      variants={{ visible: { opacity: 1, transition: { duration: 0.4 } } }}
    >
      {count.toLocaleString()}
      {sign}
    </motion.h3>
  );
};
