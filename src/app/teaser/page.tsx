'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TeaserSlide1 } from '@/components/teaser/TeaserSlide1';
import { TeaserSlide2 } from '@/components/teaser/TeaserSlide2';
import { TeaserSlide3 } from '@/components/teaser/TeaserSlide3';
import { TeaserSlide4 } from '@/components/teaser/TeaserSlide4';
import { TeaserSlide5 } from '@/components/teaser/TeaserSlide5';
import { TeaserSlide6 } from '@/components/teaser/TeaserSlide6';
import { TeaserDataProvider } from '@/components/teaser/TeaserDataProvider';

const SLIDES = [
  TeaserSlide1,
  TeaserSlide2,
  TeaserSlide3,
  TeaserSlide4,
  TeaserSlide5,
  TeaserSlide6,
];

export default function TeaserPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const goToSlide = (index: number) => {
    if (index >= 0 && index < SLIDES.length) {
      setCurrentSlide(index);
    }
  };

  const nextSlide = useCallback(() => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  }, [currentSlide]);

  const prevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  }, [currentSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  const CurrentSlideComponent = SLIDES[currentSlide];

  return (
    <TeaserDataProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
        {/* Back Button */}
        <div className="absolute top-6 left-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </Link>
        </div>

        {/* Slide Content */}
        <div className="flex-1 flex items-center justify-center p-8 pt-16">
          <div className="w-full max-w-6xl">
            <CurrentSlideComponent />
          </div>
        </div>

        {/* Navigation */}
        <div className="p-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            {/* Previous Button */}
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                ${currentSlide === 0
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
                }
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            {/* Slide Indicators */}
            <div className="flex items-center gap-2">
              {SLIDES.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all
                    ${index === currentSlide
                      ? 'bg-violet-500 w-8'
                      : 'bg-slate-600 hover:bg-slate-500'
                    }
                  `}
                />
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={nextSlide}
              disabled={currentSlide === SLIDES.length - 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                ${currentSlide === SLIDES.length - 1
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
                }
              `}
            >
              Next
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Keyboard hint */}
          <p className="text-center text-slate-600 text-xs mt-4">
            Use arrow keys or spacebar to navigate
          </p>
        </div>
      </div>
    </TeaserDataProvider>
  );
}
