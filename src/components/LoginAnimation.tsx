import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import catSvg from '../assets/cat.svg';

interface LoginAnimationProps {
  onComplete: () => void;
}

const TOTAL_DURATION_MS = 3000;

const LoginAnimation: React.FC<LoginAnimationProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, TOTAL_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 bg-black overflow-hidden"
      initial={{ opacity: 1 }}
    >
      {/* Background with cyberpunk effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#050D20] via-[#0a1628] to-[#030407]" />

      {/* Animated cat */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Left paw swipe */}
        <motion.img
          src={catSvg}
          alt="Cat"
          className="w-96 h-96 object-cover"
          animate={{
            x: [-200, 0, 150],
            rotateZ: [-15, 0, 20],
            scale: [0.8, 1, 1.1],
          }}
          transition={{
            duration: 1.2,
            times: [0, 0.4, 1],
            ease: 'easeInOut',
          }}
        />
      </motion.div>

      {/* Paw swipe effect lines */}
      <motion.div className="absolute inset-0 pointer-events-none">
        {/* Left swipe line 1 */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-32 h-1 bg-gradient-to-r from-[#65B3AE] to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        />

        {/* Left swipe line 2 */}
        <motion.div
          className="absolute top-1/3 left-1/4 w-32 h-1 bg-gradient-to-r from-[#65B3AE] to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        />

        {/* Left swipe line 3 */}
        <motion.div
          className="absolute top-1/2 left-1/4 w-32 h-1 bg-gradient-to-r from-[#65B3AE] to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.3 }}
        />
      </motion.div>

      {/* Screen tear/crack effect - left side */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(101, 179, 174, 0.3) 0%, transparent 50%)',
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
        }}
        initial={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
        animate={{
          clipPath: 'polygon(100% 0%, 100% 0%, 100% 100%, 0% 100%)',
        }}
        transition={{ delay: 1, duration: 1.2, ease: 'easeInOut' }}
      />

      {/* Screen tear/crack effect - right side */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(-90deg, rgba(127, 212, 208, 0.2) 0%, transparent 50%)',
          clipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',
        }}
        initial={{ clipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)' }}
        animate={{
          clipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 100% 100%)',
        }}
        transition={{ delay: 1, duration: 1.2, ease: 'easeInOut' }}
      />

      {/* Particle effects (screen fragments) */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-8 h-8 border-2 border-[#65B3AE]"
          style={{
            left: `${25 + i * 12}%`,
            top: `${30 + (i % 2) * 40}%`,
          }}
          initial={{
            opacity: 0,
            scale: 0,
            rotate: 0,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0.3],
            rotate: [0, 180, 360],
            x: [0, Math.random() * 100 - 50, Math.random() * 200 - 100],
            y: [0, Math.random() * 80 - 40, Math.random() * 200 + 100],
          }}
          transition={{
            delay: 1.2 + i * 0.1,
            duration: 0.8,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Glitch effect overlays */}
      <motion.div
        className="absolute inset-0 bg-[#65B3AE] mix-blend-screen"
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0, 0.1, 0, 0.05, 0],
          x: [0, 2, -2, 0],
        }}
        transition={{
          delay: 1,
          duration: 0.8,
          times: [0, 0.25, 0.5, 0.75, 1],
        }}
      />

      {/* Fade to black before revealing dashboard */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1] }}
        transition={{
          delay: 2,
          duration: 0.6,
          times: [0, 0.3, 1],
        }}
      />
    </motion.div>
  );
};

export default LoginAnimation;
