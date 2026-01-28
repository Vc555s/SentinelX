import { motion } from 'framer-motion';
import { CrimeMap } from '@/components/map/CrimeMap';

export default function LiveMap() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-screen w-full"
    >
      <CrimeMap />
    </motion.div>
  );
}
