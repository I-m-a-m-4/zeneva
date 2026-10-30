'use client';

import * as React from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface ImageLightboxModalProps {
  open: boolean;
  onClose: () => void;
  imageUrl?: string | null;
  title?: string;
  subtitle?: string;
  badge?: string;
  gallery?: string[];
  initialIndex?: number;
}

export function ImageLightboxModal({
  open,
  onClose,
  imageUrl,
  title = 'Image Preview',
  subtitle,
  badge = 'Zen Vision',
  gallery,
  initialIndex = 0,
}: ImageLightboxModalProps) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [scale, setScale] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);

  // Sync index when initialIndex changes or modal opens
  React.useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setRotation(0);
    }
  }, [open, initialIndex, imageUrl]);

  const images = gallery && gallery.length > 0 ? gallery : imageUrl ? [imageUrl] : [];
  const activeUrl = images[currentIndex] || imageUrl || '';

  // Keyboard navigation
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        setCurrentIndex((i) => (i > 0 ? i - 1 : images.length - 1));
        setScale(1);
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        setCurrentIndex((i) => (i < images.length - 1 ? i + 1 : 0));
        setScale(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, images.length, onClose]);

  if (!open || !activeUrl) return null;

  const handleZoomIn = () => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)));
  const handleZoomOut = () => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)));
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-5xl w-full max-h-[92vh] bg-card border border-border/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-foreground"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border/80 bg-muted/40">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <Badge
                variant="outline"
                className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/20 font-medium shrink-0"
              >
                {badge}
              </Badge>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-bold text-foreground truncate max-w-sm sm:max-w-md">
                  {title}
                </h4>
                {subtitle && (
                  <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
                )}
              </div>
            </div>

            {/* Quick Action Controls */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-[11px] font-mono text-muted-foreground min-w-[3rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={scale >= 3}
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRotate}
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </Button>
              {(scale !== 1 || rotation !== 0) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground px-2"
                  title="Reset Zoom & Rotation"
                >
                  Reset
                </Button>
              )}
              <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block" />
              <a
                href={activeUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
                title="Open in new tab / Download"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={onClose}
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors ml-1"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Viewport Area */}
          <div className="relative p-4 flex-1 flex items-center justify-center overflow-auto bg-black/40 min-h-[360px] sm:min-h-[480px]">
            {/* Gallery Previous Button */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex((i) => (i > 0 ? i - 1 : images.length - 1));
                  setScale(1);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all shadow-md backdrop-blur-sm cursor-pointer"
                title="Previous photo"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Main Image with Zoom & Rotate transform */}
            <div
              className="relative max-h-[75vh] max-w-full flex items-center justify-center transition-transform duration-150 ease-out"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg)`,
                cursor: scale > 1 ? 'grab' : 'default',
              }}
            >
              <img
                src={activeUrl}
                alt={title}
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl select-none"
                draggable={false}
              />
            </div>

            {/* Gallery Next Button */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex((i) => (i < images.length - 1 ? i + 1 : 0));
                  setScale(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all shadow-md backdrop-blur-sm cursor-pointer"
                title="Next photo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Gallery Counter Badge */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-mono font-medium shadow-md">
                Photo {currentIndex + 1} of {images.length}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
