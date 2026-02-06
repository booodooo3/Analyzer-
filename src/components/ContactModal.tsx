import React, { useState } from 'react';
import { X, MapPin, Mail, Send } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, subject, message } = formData;
    
    // Construct mailto link
    const body = `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;
    const mailtoLink = `mailto:support@analyzer-a.org?subject=${encodeURIComponent(subject || 'Contact from Website')}&body=${encodeURIComponent(body)}`;
    
    // Open default mail client
    window.location.href = mailtoLink;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-xl" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-5xl bg-zinc-900 rounded-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-500 border border-white/10">
        
        {/* Close Button (Mobile) */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-black/20 rounded-full text-white/70 hover:text-white md:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Column (Info) */}
        <div className="w-full md:w-[40%] bg-zinc-800/80 p-10 flex flex-col justify-center relative overflow-hidden">
           {/* Background decoration to match "Experience elegance" vibe */}
           <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
             <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl"></div>
             <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl"></div>
           </div>

           <div className="relative z-10">
              <h2 className="text-[#5f63f2] text-3xl font-bold mb-5">Contact Us</h2>
              <p className="text-zinc-400 leading-relaxed mb-8 text-sm">
                Experience the elegance of portable Python solutions. We craft powerful, standalone scripts that run instantly.
              </p>
              
              <div className="flex items-center mb-4 text-zinc-300">
                <div className="w-10 h-10 bg-white/5 rounded-[10px] flex items-center justify-center mr-4 text-[#5f63f2] font-bold shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <span>Kuwait</span>
              </div>
              
              <div className="flex items-center mb-4 text-zinc-300">
                <div className="w-10 h-10 bg-white/5 rounded-[10px] flex items-center justify-center mr-4 text-[#5f63f2] font-bold shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <span>support@analyzer-a.org</span>
              </div>
           </div>
        </div>

        {/* Right Column (Form) */}
        <div className="w-full md:w-[60%] p-10 bg-zinc-900 relative">
          <div className="flex justify-end mb-2 hidden md:block absolute top-6 right-6">
            <button 
              onClick={onClose}
              className="p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4">
            <div className="mb-5">
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Full Name" 
                required
                className="w-full p-4 bg-zinc-800/50 border border-zinc-700 rounded-[10px] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#5f63f2] transition-colors"
              />
            </div>

            <div className="mb-5">
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email Address" 
                required
                className="w-full p-4 bg-zinc-800/50 border border-zinc-700 rounded-[10px] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#5f63f2] transition-colors"
              />
            </div>

            <div className="mb-5">
              <input 
                type="text" 
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder="Subject" 
                required
                className="w-full p-4 bg-zinc-800/50 border border-zinc-700 rounded-[10px] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#5f63f2] transition-colors"
              />
            </div>

            <div className="mb-5">
              <textarea 
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Your Message" 
                required
                rows={4}
                className="w-full p-4 bg-zinc-800/50 border border-zinc-700 rounded-[10px] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#5f63f2] transition-colors resize-none h-[120px]"
              />
            </div>

            <button 
              type="submit" 
              className="w-full p-4 bg-[#5f63f2] hover:bg-[#4a4ec7] text-white rounded-[10px] text-base font-bold cursor-pointer transition-colors flex items-center justify-center gap-2"
            >
              Send Message
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default ContactModal;
