'use client';

import React, { useState, useEffect } from 'react';
import { Paperclip, Send } from 'lucide-react';

const TypewriterChatDemo = () => {
  const [currentText, setCurrentText] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  
  const questions = [
    "What's the cap rate for multifamily properties in Pittsburgh, PA?",
    "Analyze the attached property brochure for the apartment at 73 Rhode Island Ave in Newport, RI",
    "What are key principles in building a multifamily business?",
    "The owner rejected my first offer. Give me some suggestions on how to improve the offer without giving up leverage.",
    "What's the typical rent for a 1-bedroom apartment in Nashua, NH?"
  ];

  useEffect(() => {
    const currentQuestion = questions[currentQuestionIndex];
    
    if (isTyping && currentText.length < currentQuestion.length) {
      // Typing forward
      const timeout = setTimeout(() => {
        setCurrentText(currentQuestion.slice(0, currentText.length + 1));
      }, 15 + Math.random() * 10); // Very fast typing speed with variation
      
      return () => clearTimeout(timeout);
    } else if (isTyping && currentText.length === currentQuestion.length) {
      // Pause when fully typed
      const timeout = setTimeout(() => {
        setIsTyping(false);
      }, 2500); // Pause for 2.5 seconds to let users read
      
      return () => clearTimeout(timeout);
    } else if (!isTyping) {
      // Clear and move to next question
      const timeout = setTimeout(() => {
        setCurrentText('');
        setCurrentQuestionIndex((prev) => (prev + 1) % questions.length);
        setIsTyping(true);
      }, 500); // Brief pause before starting next question
      
      return () => clearTimeout(timeout);
    }
  }, [currentText, currentQuestionIndex, isTyping, questions]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="relative">
        <div className="bg-white border border-gray-200 rounded-2xl px-8 py-8 shadow-lg">
          <div className="flex items-center">
            <Paperclip size={24} className="text-gray-600 mr-4" />
            <div className="flex-1 relative">
              <span className="text-gray-900 text-lg">
                {currentText}
                {isTyping && (
                  <span className="animate-pulse text-gray-900">|</span>
                )}
              </span>
              {currentText === '' && !isTyping && (
                <span className="text-gray-500 text-lg">Ask me anything...</span>
              )}
            </div>
            <Send size={24} className="text-gray-600 ml-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypewriterChatDemo;