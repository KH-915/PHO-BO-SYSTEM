"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@radix-ui/react-avatar";
import { GlobeIcon, UsersIcon, MessageCircleIcon } from "lucide-react";

export function WelcomePage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center font-sans">
      <div className="max-w-7xl w-full flex gap-12 px-6 py-12">

        {/* Left Side: Logo + Info */}
        <div className="flex-1 flex flex-col justify-center gap-8">
          {/* Logo and Website Name */}
          <div className="flex items-center gap-3 mb-8">
            <Avatar className="bg-blue-500 w-12 h-12 text-xl font-bold flex items-center justify-center">
              W
            </Avatar>
            <span className="text-4xl font-extrabold tracking-tight">Pho Bo</span>
          </div>

          {/* Tagline */}
          <h1 className="text-5xl font-bold leading-tight">
            Explore. Connect. Innovate.
          </h1>
          <p className="text-gray-300 text-lg max-w-md">
            Discover communities, engage with people worldwide, and unlock futuristic features. Simple, secure, and cutting-edge.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            <Card className="bg-gray-800 border-none p-4 flex items-center gap-3 hover:bg-gray-700 transition-colors">
              <GlobeIcon className="w-6 h-6 text-blue-400" />
              <div>
                <h3 className="font-bold text-white">Global Reach</h3>
                <p className="text-gray-300 text-sm">Connect with people from around the world effortlessly.</p>
              </div>
            </Card>
            <Card className="bg-gray-800 border-none p-4 flex items-center gap-3 hover:bg-gray-700 transition-colors">
              <UsersIcon className="w-6 h-6 text-blue-400" />
              <div>
                <h3 className="font-bold text-white">Communities</h3>
                <p className="text-gray-300 text-sm">Join groups that match your interests and collaborate.</p>
              </div>
            </Card>
            <Card className="bg-gray-800 border-none p-4 flex items-center gap-3 hover:bg-gray-700 transition-colors">
              <MessageCircleIcon className="w-6 h-6 text-blue-400" />
              <div>
                <h3 className="font-bold text-white">Instant Chat</h3>
                <p className="text-gray-300 text-sm">Stay in touch with friends and colleagues seamlessly.</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Right Side: Login / Sign Up */}
        <aside className="w-96 shrink-0">
          <Card className="bg-gray-800 h-96 flex flex-col justify-center">
            <CardContent className="flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-white text-center">Log In</h2>
              <Input placeholder="Email address or phone" className="rounded-md bg-gray-900 border-gray-700 text-white" />
              <Input placeholder="Password" type="password" className="rounded-md bg-gray-900 border-gray-700 text-white" />
              <Button variant="default" className="w-full">Log In</Button>
              <div className="flex justify-center py-2">
                <Button variant="outline" className="px-6">Create Account</Button>
              </div>
              <div className="text-center text-sm text-gray-400">
                <a href="#" className="hover:underline">Forgot password?</a>
              </div>
            </CardContent>
          </Card>
        </aside>

      </div>
    </div>
  );
}
