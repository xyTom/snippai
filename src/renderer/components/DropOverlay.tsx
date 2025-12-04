import React from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import ImageIcon from "./icons/ImageIcon";

type Props = {
  message?: string;
  subtitle?: string;
};

const DropOverlay: React.FC<Props> = ({ message, subtitle }) => {
  const { t } = useTranslation();

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center
                 bg-black/60 backdrop-blur-sm"
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl px-7 py-6 text-center shadow-2xl text-gray-100 select-none">
        <motion.div
          initial={{ rotate: 0, x: 0 }}
          animate={{ rotate: 14, x: 4 }}
          transition={{ duration: 0.5, ease: "easeInOut", delay: 0.05 }}
        >
          <ImageIcon className="w-14 h-14 text-white drop-shadow-xl" />
        </motion.div>
        <p className="text-lg font-semibold text-white leading-tight">
          {message ?? t("drop_overlay_message", "Drop image to analyze")}
        </p>
        {subtitle && (
          <p className="text-sm text-gray-200/80 max-w-xs leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default DropOverlay;
