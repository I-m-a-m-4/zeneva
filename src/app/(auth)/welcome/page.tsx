'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Pause, Play } from 'lucide-react';
import Image from 'next/image';
import { AppConfig } from '@/lib/config';

const slides = [
  {
    video: 'https://res.cloudinary.com/dd1czj85j/video/upload/v1786053655/zeneva/zeneva_welcome_signup_video_6.mp4',
    poster: '/signup-video-6-poster.jpg',
    headline: <>Welcome to the future<br />of smart retail</>,
  },
  {
    video: 'https://res.cloudinary.com/dd1czj85j/video/upload/v1786053651/zeneva/zeneva_welcome_signup_video_5.mp4',
    poster: '/signup-video-5-poster.jpg',
    headline: <>Empower your business<br />to scale endlessly</>,
  },
  {
    video: 'https://res.cloudinary.com/dd1czj85j/video/upload/v1786053636/zeneva/zeneva_welcome_signup_video_3.mp4',
    poster: '/signup-video-3-poster.jpg',
    headline: <>Get detailed insights,<br />in real-time</>,
  },
  {
    video: 'https://res.cloudinary.com/dd1czj85j/video/upload/v1786053621/zeneva/zeneva_welcome_signup_video_2.mp4',
    poster: '/signup-video-2-poster.jpg',
    headline: <>Manage your inventory<br />with absolute ease</>,
  },
  {
    video: 'https://res.cloudinary.com/dd1czj85j/video/upload/v1786053615/zeneva/zeneva_welcome_signup_video_1.mp4',
    poster: '/signup-video-1-poster.jpg',
    headline: <>One point of sale,<br />wherever you grow</>,
  },
];

export default function WelcomePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // When the current video ends, advance to the next one
  const handleEnded = (index: number) => {
    if (index === currentIndex) {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }
  };

  // When currentIndex changes, manage play state
  useEffect(() => {
    slides.forEach((_, index) => {
      const video = videoRefs.current[index];
      if (!video) return;

      if (index === currentIndex) {
        // Seek to start and play
        video.currentTime = 0;
        if (isPlaying) video.play().catch(() => {});
      } else {
        // Pause immediately without seeking — keeps the first frame buffered
        // so the crossfade has a visible frame to transition into
        video.pause();
      }
    });
  }, [currentIndex, isPlaying]);

  const togglePlay = () => {
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      if (isPlaying) {
        currentVideo.pause();
      } else {
        currentVideo.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black font-sans selection:bg-white/20">
      {/* Background Videos */}
      {slides.map((slide, index) => (
        <video
          key={index}
          ref={(el) => { videoRefs.current[index] = el; }}
          loop={false}
          muted
          playsInline
          preload="auto"
          poster={slide.poster}
          onEnded={() => handleEnded(index)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? 'opacity-80 z-[0]' : 'opacity-0 z-[-1]'
          }`}
        >
          <source src={slide.video} type="video/mp4" />
        </video>
      ))}

      {/* Orangish filter overlay */}
      <div className="absolute inset-0 bg-orange-500/40 mix-blend-overlay z-[1] pointer-events-none" />

      {/* Dark overlay gradient for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

      {/* Top Bar (Logo & Controls) */}
      <div className="absolute top-0 inset-x-0 p-6 flex items-start justify-between z-10">
        <div>
          <Image 
            src={AppConfig.logoUrl} 
            alt="Zeneva Logo" 
            width={96} 
            height={96} 
            className="w-24 h-24 object-contain drop-shadow-md"
          />
        </div>
        
        <button
          onClick={togglePlay}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white transition-all hover:bg-black/60 focus:outline-none"
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" fill="currentColor" stroke="currentColor" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" fill="currentColor" stroke="currentColor" />
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 pb-12 z-10">
        
        {/* Headline */}
        <div className="mb-8 max-w-2xl grid">
          {slides.map((slide, index) => (
            <h1
              key={index}
              className={`col-start-1 row-start-1 text-[52px] leading-[1.05] tracking-[-0.04em] font-medium text-white drop-shadow-sm sm:text-6xl md:text-7xl transition-opacity duration-1000 ease-in-out ${
                index === currentIndex ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            >
              {slide.headline}
            </h1>
          ))}
        </div>

        {/* Slide Dots */}
        <div className="flex items-center gap-2 mb-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              aria-label={`Go to video ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? 'w-6 h-2 bg-white'
                  : 'w-2 h-2 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full sm:max-w-md">
          <Link
            href="/signup"
            className="flex h-[56px] w-full items-center justify-center rounded-[28px] bg-white text-base font-medium text-black transition-transform active:scale-[0.98] hover:bg-gray-100"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="flex h-[56px] w-full items-center justify-center rounded-[28px] bg-orange-950/90 text-base font-medium text-white backdrop-blur-sm transition-transform active:scale-[0.98] hover:bg-orange-900"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
