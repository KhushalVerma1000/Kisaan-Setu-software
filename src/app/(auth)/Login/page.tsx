import React from 'react';
import { login } from './actions';
import { LoginForm } from "@/components/login-form";

interface LoginProps {
  className?: string;
}

const Login: React.FC<LogInProps> = ({ className = "" }) => {
  return (
    <div className={`grid min-h-svh lg:grid-cols-2 ${className}`}>
      {/* Left side - Login Form */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        {/* Logo and Brand */}
        <div className="flex justify-center gap-2 md:justify-start">
          <a 
            href="#" 
            className="flex items-center gap-2 font-medium hover:opacity-80 transition-opacity duration-200"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground overflow-hidden">
              <img 
                src="/Logo.jpeg"  
                alt="Kisaan Khata Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-lg font-semibold">Kisaan Setu</span>
          </a>
        </div>

        {/* Login Form Container */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm 
              loginAction={login}
            />
          </div>
        </div>
      </div>

      {/* Right side - Background Image */}
      <div className="relative hidden bg-muted lg:block">
        <img
          src="/LoginPageImage.jpg"
          alt="Agricultural landscape showing farming and cultivation"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale transition-all duration-300"
        />
        
        {/* Optional overlay for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent dark:from-black/40" />
      </div>
    </div>
  );
};

export default Login;