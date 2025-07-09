'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'

interface SlideshowProps {
  images: string[]
  interval?: number
  className?: string
}

export const Slideshow: React.FC<SlideshowProps> = ({
  images,
  interval = 5000,
  className = ""
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (images.length <= 1) return

    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
    }, interval)

    return () => clearInterval(timer)
  }, [images.length, interval])

  if (images.length === 0) return null

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {images.map((image, index) => (
        <div
          key={image}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={image}
            alt={`Slide ${index + 1}`}
            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale transition-all duration-300"
            width={1000}
            height={1000}
            priority={index === 0}
          />
        </div>
      ))}
      
      {/* Optional overlay for better contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent dark:from-black/40" />
      
      {/* Slide indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-white/80 scale-110' 
                : 'bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}