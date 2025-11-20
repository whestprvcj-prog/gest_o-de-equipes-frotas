import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X } from 'lucide-react';
import { GeminiLiveService } from '../services/geminiService';
import AudioVisualizer from './AudioVisualizer';
import { AddStopArgs, RemoveStopArgs, DeliveryStop } from '../types';

interface LiveAssistantProps {
  onAddStop: (args: AddStopArgs) => void;
  onRemoveStop: (args: RemoveStopArgs) => void;
  getStops: () => DeliveryStop[];
}

const LiveAssistant: React.FC<LiveAssistantProps> = ({ onAddStop, onRemoveStop, getStops }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const serviceRef = useRef<GeminiLiveService | null>(null);

  useEffect(() => {
    // Initialize service only once
    serviceRef.current = new GeminiLiveService(
      (args) => {
        console.log("Adding stop via voice", args);
        onAddStop(args);
      },
      (args) => {
        console.log("Removing stop via voice", args);
        onRemoveStop(args);
      },
      () => {
        // Provide current state to the model
        return JSON.stringify(getStops().map(s => ({ name: s.customerName, address: s.address, status: s.status })));
      },
      (status) => {
        setIsConnected(status);
        setIsConnecting(false);
      },
      (level) => {
        // Smooth out the level update slightly to avoid React render thrashing
        if (level > 0.01) setAudioLevel(level);
        else setAudioLevel(0);
      }
    );

    return () => {
      serviceRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 
  
  const getStopsRef = useRef(getStops);
  const onAddStopRef = useRef(onAddStop);
  const onRemoveStopRef = useRef(onRemoveStop);
  
  useEffect(() => {
      getStopsRef.current = getStops;
      onAddStopRef.current = onAddStop;
      onRemoveStopRef.current = onRemoveStop;
  }, [getStops, onAddStop, onRemoveStop]);

  if (serviceRef.current) {
      (serviceRef.current as any).onListStops = () => JSON.stringify(getStopsRef.current().map(s => ({ name: s.customerName, address: s.address, status: s.status })));
      (serviceRef.current as any).onAddStop = (args: AddStopArgs) => onAddStopRef.current(args);
      (serviceRef.current as any).onRemoveStop = (args: RemoveStopArgs) => onRemoveStopRef.current(args);
  }

  const toggleSession = async () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsConnecting(true);
      await serviceRef.current?.connect();
    } else {
        await serviceRef.current?.disconnect();
        setIsOpen(false);
        setIsConnecting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button - Positioned higher to clear bottom nav */}
      <button
        onClick={toggleSession}
        className={`fixed bottom-24 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300 
          ${isOpen ? 'bg-red-500 rotate-180' : 'bg-indigo-600 hover:bg-indigo-700 rotate-0'} text-white`}
        aria-label={isOpen ? "Stop Voice Assistant" : "Start Voice Assistant"}
      >
        {isOpen ? <X size={28} /> : <Mic size={28} />}
      </button>

      {/* Overlay Panel */}
      <div
        className={`fixed bottom-40 right-6 z-40 w-80 bg-white rounded-2xl shadow-2xl transform transition-all duration-300 origin-bottom-right border border-slate-100 overflow-hidden
          ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10 pointer-events-none'}
        `}
      >
        <div className="bg-indigo-600 p-4 text-white">
          <h3 className="font-semibold text-lg flex items-center gap-2">
             Assistente Gemini
             {isConnecting && <span className="text-xs bg-indigo-500 px-2 py-0.5 rounded animate-pulse">Conectando...</span>}
             {isConnected && <span className="text-xs bg-green-500 px-2 py-0.5 rounded">Ao Vivo</span>}
          </h3>
          <p className="text-indigo-100 text-xs mt-1">
            Fale para adicionar ou gerenciar entregas.
          </p>
        </div>
        
        <div className="p-6 flex flex-col items-center justify-center min-h-[160px] bg-slate-50">
          {isConnected ? (
             <div className="w-full">
                <div className="text-center mb-4 text-slate-500 text-sm">
                    {audioLevel > 0.05 ? "Ouvindo..." : "Aguardando fala..."}
                </div>
                <AudioVisualizer isActive={isConnected} level={audioLevel} />
             </div>
          ) : (
             <div className="text-slate-400 text-sm italic">
                {isConnecting ? "Estabelecendo conexão..." : "Assistente desconectado."}
             </div>
          )}
        </div>
        
        {/* Simple hint footer */}
        <div className="px-4 py-3 bg-slate-100 border-t border-slate-200 text-xs text-slate-500">
          Tente: "Adicionar entrega para Maria na Rua das Flores, 100"
        </div>
      </div>
    </>
  );
};

export default LiveAssistant;