import React, { useState } from 'react';
import { X, MapPin, Mail, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

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
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/send-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") === -1) {
        throw new Error("Server error: received non-JSON response. Is the backend server running?");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      
      // Auto close after success (optional, or just show success message)
      setTimeout(() => {
        setStatus('idle');
      }, 5000);

    } catch (error: any) {
      console.error('Contact Error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSending(false);
    }
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
              disabled={isSending || status === 'success'}
              className={`w-full p-4 rounded-[10px] text-base font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 ${
                status === 'success' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-[#5f63f2] hover:bg-[#4a4ec7]'
              } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : status === 'success' ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Message Sent!
                </>
              ) : (
                <>
                  Send Message
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>

            {status === 'error' && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </form>
        </div>

      </div>
    </div>
  );
};

export default ContactModal;
