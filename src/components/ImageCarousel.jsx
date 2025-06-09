// components/ImageCarousel.jsx
'use client'; // Required for useRef, useEffect, event handlers

import * as React from 'react';
import Autoplay from 'embla-carousel-autoplay';
import Image from 'next/image'; // Use Next.js Image for optimization

import { Card, CardContent } from '@/components/ui/card'; // Optional: for styling slide items
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

// --- Configuration ---
const AUTOPLAY_DELAY = 1000; // Delay between slides in milliseconds (e.g., 4 seconds)
const STOP_ON_INTERACTION = true; // Should autoplay stop when user interacts?
const LOOP_CAROUSEL = true; // Should the carousel loop infinitely?

// --- Image Data ---
// Replace these with your actual image paths and alt text
// Put your images in the `public` folder (e.g., public/images/image1.jpg)
const images = [
  {
    src: '/FarmerCarausalImage1.jpg', // Example path in public folder
    alt: 'Placeholder Image 1',
    width: 1000, // Provide actual width
    height: 300, // Provide actual height
  },
  {
    src: '/FarmerCarausalImage2.jpg', // Example path in public folder
    alt: 'Placeholder Image 2',
    width: 1000,
    height: 600,
  },
  {
    src: '/FarmerCarausalImage3.jpg', // Example path in public folder
    alt: 'Placeholder Image 3',
    width: 1000,
    height: 300,
  },
];

export function ImageCarousel() {
  // Use useRef for the autoplay plugin instance
  const plugin = React.useRef(
    Autoplay({ delay: AUTOPLAY_DELAY, stopOnInteraction: STOP_ON_INTERACTION })
  );

  return (
    <div className="w-full max-w-5xl mx-auto p-4"> {/* Added container with max-width and centering */}
      <Carousel
        plugins={[plugin.current]}
        opts={{
            loop: LOOP_CAROUSEL,
            align: "start", // Or "center"
        }}
        className="w-full"
        // Optional: Pause on hover
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.play} // Use play() instead of reset() to resume from current state if stopped by interaction
      >
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index} className="basis-full"> {/* Each item takes full width */}
              <div className="p-1">
                {/* Optional Card wrapper for styling */}
                <Card className="overflow-hidden">
                  <CardContent className="flex aspect-[16/9] items-center justify-center p-0 h-90"> {/* Adjust aspect ratio as needed, p-0 to remove padding */}
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={image.width} // Required for Next/Image
                      height={image.height} // Required for Next/Image
                      priority={index === 0} // Prioritize loading the first image
                      className="object-cover w-full h-full" // Ensure image covers the area
                    />
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10" /> {/* Position buttons */}
        <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10" />
      </Carousel>
    </div>
  );
}