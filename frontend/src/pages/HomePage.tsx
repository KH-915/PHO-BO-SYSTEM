"use client";

import { Avatar } from "@radix-ui/react-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Header } from "@/components/Header";

export function HomePage() {
  return (
    // Outer container fills the screen and provides the main background
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      
      <Header />

      {/* FIX APPLIED HERE:
        This container now spans the full width (w-full) of the viewport.
      */}
      <div className="flex flex-1 w-full p-4">
        
        {/*
          NEW INNER WRAPPER:
          This container applies the max-width (max-w-7xl) and centering (mx-auto), 
          ensuring the sidebars and feed are aligned and centered with the header.
        */}
        <div className="max-w-7xl mx-auto w-full flex gap-4">
          
          {/* Left Sidebar */}
          <aside className="w-64 shrink-0 hidden md:flex flex-col gap-4">
            <Card>
              <CardContent>
                <ul className="space-y-2 text-gray-700">
                  <li className="font-semibold text-blue-600 bg-blue-50 rounded px-3 py-2 cursor-pointer transition-colors">Home</li>
                  <li className="hover:bg-gray-100 rounded px-3 py-2 cursor-pointer transition-colors">Friends</li>
                  <li className="hover:bg-gray-100 rounded px-3 py-2 cursor-pointer transition-colors">Groups</li>
                  <li className="hover:bg-gray-100 rounded px-3 py-2 cursor-pointer transition-colors">Marketplace</li>
                  <li className="hover:bg-gray-100 rounded px-3 py-2 cursor-pointer transition-colors">Watch</li>
                </ul>
              </CardContent>
            </Card>
          </aside>

          {/* Feed */}
          <main className="flex-1 flex flex-col gap-4">
            {/* Create Post */}
            <Card>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="bg-blue-500">
                    U
                  </Avatar>
                  <Input placeholder="What's on your mind?" className="flex-1 rounded-full bg-gray-50 border-gray-200" />
                </div>
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <Button variant="default">Post</Button>
                </div>
              </CardContent>
            </Card>

            {/* Sample Post Feed */}
            <ScrollArea className="flex flex-col gap-4 space-y-4">
              {[1, 2, 3, 4, 5].map((post) => (
                <Card key={post}>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="w-12 h-12 bg-indigo-500">
                        P{post}
                      </Avatar>
                      <div>
                        <div className="font-bold text-gray-800">User Name {post}</div>
                        <div className="text-sm text-gray-500">2 hrs ago</div>
                      </div>
                    </div>
                    <div className="mb-3 text-gray-700">
                      This is a sample post content. The fixed layout now fills the screen beautifully! Post #{post}.
                    </div>
                    <div className="flex gap-2 text-gray-600 text-sm border-t pt-3 border-gray-100">
                      <Button variant="ghost" className="flex-1">Like</Button>
                      <Button variant="ghost" className="flex-1">Comment</Button>
                      <Button variant="ghost" className="flex-1">Share</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="h-4"></div> {/* Spacer for scroll area */}
            </ScrollArea>
          </main>

          {/* Right Sidebar */}
          <aside className="w-64 shrink-0 hidden lg:flex flex-col gap-4">
            <Card>
              <CardContent>
                <div className="font-bold mb-2 text-gray-800">Suggestions</div>
                <ul className="space-y-2 text-gray-700">
                  <li className="hover:bg-gray-100 rounded px-3 py-2 cursor-pointer transition-colors">User A</li>
                  <li className="hover:bg-gray-100 rounded px-3 py-2 cursor-pointer transition-colors">User B</li>
                  <li className="hover:bg-gray-100 rounded px-3 py-2 cursor-pointer transition-colors">User C</li>
                </ul>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
};