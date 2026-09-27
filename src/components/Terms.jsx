import React from 'react';
import { Shield, Check } from 'lucide-react';

export default function Terms({ onAccept }) {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col h-full w-full">
      <div className="flex-1 overflow-y-auto p-6 flex flex-col max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6 mt-4">
          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Welcome to Navix AI</h1>
            <p className="text-[13px] text-slate-500 font-medium">Please review our Terms & Privacy Policy</p>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mb-6">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h2 className="text-[14px] font-semibold text-slate-800">Terms of Service & Privacy Policy</h2>
          </div>
          <div className="flex-1 p-5 overflow-y-auto text-[13px] text-slate-600 leading-relaxed space-y-4">
            <p>
              <strong>1. Open Source & Privacy:</strong> Navix AI is an open-source browser automation and AI assistant. We prioritize your privacy. Your API keys, chat history, and settings are stored locally on your device and are never sent to our servers.
            </p>
            <p>
              <strong>2. Automation Risks:</strong> You acknowledge that this tool has the capability to automate browser actions, visit websites, and fill out forms on your behalf using AI. You are solely responsible for all actions performed by the AI on your device.
            </p>
            <p>
              <strong>3. Data Transmission to AI Providers:</strong> When interacting with the AI, the contents of the current webpage, screenshots, and your prompts may be sent directly to the AI provider (e.g., Google Gemini, OpenAI, Hugging Face) that you have configured. Please ensure you do not expose sensitive personal information to third-party AI providers unless you explicitly trust them.
            </p>
            <p>
              <strong>4. Security:</strong> Always verify before executing high-risk browser actions (e.g., submitting forms, making purchases, or deleting data). Navix AI will attempt to prompt for confirmation on sensitive actions, but you are ultimately responsible for confirming the safety of these actions.
            </p>
            <p>
              <strong>5. Disclaimer of Warranty:</strong> This software is provided "as is", without warranty of any kind. The creators and contributors are not liable for any damages, loss of data, or account bans resulting from the use of this automation tool.
            </p>
            <p>
              By clicking "Agree & Continue", you confirm that you have read, understood, and agree to these terms and the privacy policy.
            </p>
          </div>
        </div>

        <button
          onClick={onAccept}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-4"
        >
          <Check className="w-5 h-5" />
          Agree & Continue
        </button>
      </div>
    </div>
  );
}
