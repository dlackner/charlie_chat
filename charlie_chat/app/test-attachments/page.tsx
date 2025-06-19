"use client";

import { MyRuntimeProvider } from "@/app/MyRuntimeProvider";
import { Thread } from "@/components/assistant-ui/thread";

export default function TestAttachmentsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">
            Test Attachments
          </h1>
          <div className="bg-white rounded-lg shadow-lg h-[600px]">
            <MyRuntimeProvider testMode={true}>
              <Thread />
            </MyRuntimeProvider>
          </div>
        </div>
      </div>
    </div>
  );
}