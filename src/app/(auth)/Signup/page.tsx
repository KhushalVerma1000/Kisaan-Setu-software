import React from 'react'
import { signup } from './actions'
import { SignUpForm } from "@/components/signUp-form"
import { Slideshow } from "@/components/slideshow"
import Image from "next/image"

// Array of background images for signup page
const signupImages = [
  "/login-bg-1.jpg",
  "/login-bg-2.jpg",
  "/login-bg-3.jpg", // Add more images as needed
  // Add more image paths here
];

const SignUp: React.FC = () => {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground overflow-hidden">
              <Image
                src="/Logo.jpeg"
                alt="Kisaan Khata Logo"
                className="h-full w-full object-contain"
                width={24}
                height={24}
                style={{
                  maxWidth: "100%",
                  height: "auto"
                }} />
            </div>
            <span className="text-lg font-semibold">Kisaan Setu</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <SignUpForm signUpAction={signup} />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Slideshow 
          images={signupImages}
          interval={4000}
          className="h-full w-full"
        />
      </div>
    </div>
  );
}

export default SignUp