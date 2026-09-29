"use client";
import React, { useRef, useEffect } from "react";

export function SettingsInput({ label, value, type = "text", placeholder, icon }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <input 
          type={type} 
          defaultValue={value} 
          placeholder={placeholder} 
          className="w-full bg-gray-50 dark:bg-[#0b1121] border border-gray-100 dark:border-white/5 rounded-2xl py-4 px-6 text-sm font-bold text-[#001F3F] dark:text-white outline-none focus:ring-2 focus:ring-[#4931F7]/20 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600" 
        />
        {icon && <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300">{icon}</div>}
      </div>
    </div>
  );
}

// 🟢 Ajout du ModalInput
export function ModalInput({ label, value, onChange, type = "text", placeholder, icon, required }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative">
        <input 
          type={type} 
          value={value} 
          onChange={onChange} 
          placeholder={placeholder} 
          required={required} 
          className="w-full bg-gray-50 dark:bg-[#0b1121] border border-gray-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-[#001F3F] dark:text-white outline-none focus:ring-2 focus:ring-[#4ECDC4]/50 transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600" 
        />
        {icon && <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
      </div>
    </div>
  );
}

// 🟢 Ajout de l'InfoCard
export function InfoCard({ icon, label, value }) {
  return (
    <div className="bg-white dark:bg-[#151e32] p-5 rounded-[1.5rem] border border-gray-100 dark:border-white/5 shadow-sm">
      <div className="text-[#4931F7] mb-2">{icon}</div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-bold text-[#001F3F] dark:text-white">{value}</p>
    </div>
  );
}

export function TemplateCard({ icon, title, desc }) {
  return (
    <div className="p-6 rounded-[2rem] bg-white dark:bg-[#0b1121] border border-gray-100 dark:border-white/5 hover:border-[#4931F7]/30 hover:shadow-lg hover:shadow-[#4931F7]/5 transition-all cursor-pointer group flex flex-col items-start text-left">
      <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 text-[#4931F7] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">{icon}</div>
      <h4 className="font-black text-[#001F3F] dark:text-white mb-2">{title}</h4>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
      <div className="mt-4 text-[10px] font-black text-[#4931F7] uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        Configurer <span className="text-lg leading-none">→</span>
      </div>
    </div>
  );
}

export const AutoResizeTextarea = ({ value, onChange, className }) => {
  const textareaRef = useRef(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);
  return (
    <textarea ref={textareaRef} value={value} onChange={(e) => onChange(e.target.value)} className={`${className} overflow-hidden resize-none`} rows={1} />
  );
};