import React from 'react';
import { login } from './actions';
import { LoginForm } from "@/components/login-form";
import { googleSignInAction } from "./googleSignInAction";
import { Slideshow } from "@/components/slideshow";
import Image from 'next/image';
import Link from 'next/link';

// Array of background images for login page
const loginImages = [
  "/login-bg-1.jpg",
  "/login-bg-2.jpg",
  "/login-bg-3.jpg", // Add more images as needed
  // Add more image paths here
];

const Login = () => {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left side - Login Form */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        {/* Logo and Brand */}
        <div className="flex justify-center gap-2 md:justify-start">
          <Link
            href="/" 
            className="flex items-center gap-2 font-medium hover:opacity-80 transition-opacity duration-200"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground overflow-hidden">
              <Image
                src="/Logo.jpeg"  
                alt="Kisaan Khata Logo"
                className="h-full w-full object-contain"
                width={24}
                height={24}
              />
            </div>
            <span className="text-lg font-semibold">Kisaan Setu</span>
          </Link>
        </div>

        {/* Login Form Container */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm 
              loginAction={login}
              // googleSignInAction={googleSignInAction()}
            />
          </div>
        </div>
      </div>

      {/* Right side - Background Slideshow */}
      <div className="relative hidden bg-muted lg:block">
        <Slideshow 
          images={loginImages}
          interval={4000}
          className="h-full w-full"
        />
      </div>
    </div>
  );
};

export default Login;