
'use client';

import React, { useState, useEffect } from 'react';

interface ConfettiPiece {
  id: number;
  style: React.CSSProperties;
}

const Confetti = ({ trigger, onComplete }: { trigger: boolean, onComplete: () => void }) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (trigger) {
      const newPieces: ConfettiPiece[] = Array.from({ length: 150 }).map((_, i) => {
        const fromLeft = Math.random() > 0.5;
        const colors = [
            '#F97316', // deep orange
            'hsl(var(--primary))', // theme orange
            '#3B82F6', // vibrant blue
        ];
        
        return {
          id: i,
          style: {
            left: fromLeft ? `${-10 + Math.random() * 20}%` : `${90 + Math.random() * 20}%`,
            top: '-10%',
            animationName: fromLeft ? 'confetti-blast-left' : 'confetti-blast-right',
            animationTimingFunction: 'cubic-bezier(0.1, 1.3, .8, 1)',
            animationFillMode: 'forwards',
            animationDuration: `${Math.random() * 2 + 3}s`,
            animationDelay: `${Math.random() * 0.2}s`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            transform: `rotate(${Math.random() * 360}deg)`
          },
        }
      });
      setPieces(newPieces);
      
      const longestDuration = 5000;
      const timer = setTimeout(() => {
        setPieces([]);
        onComplete();
      }, longestDuration);

      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  if (!trigger) return null;

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-[9999] overflow-hidden">
      {pieces.map(piece => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={piece.style}
        />
      ))}
    </div>
  );
};

export default Confetti;
