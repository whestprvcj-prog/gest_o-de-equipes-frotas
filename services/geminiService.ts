import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { createPcmBlob, base64ToBytes, decodeAudioData } from './audioUtils';
import { AddStopArgs, RemoveStopArgs } from '../types';

// Declaração para evitar erro TS2580 no ambiente de navegador/build
declare const process: { env: { API_KEY: string } };

// Define Tools for the model
const addDeliveryStopTool: FunctionDeclaration = {
  name: 'addDeliveryStop',
  parameters: {
    type: Type.OBJECT,
    description: 'Adiciona uma nova parada de entrega na rota atual.',
    properties: {
      customerName: { type: Type.STRING, description: 'Nome do cliente.' },
      address: { type: Type.STRING, description: 'Endereço completo da entrega.' },
      notes: { type: Type.STRING, description: 'Observações opcionais sobre a entrega (ex: pacote frágil, deixar na portaria).' }
    },
    required: ['customerName', 'address']
  }
};

const removeDeliveryStopTool: FunctionDeclaration = {
  name: 'removeDeliveryStop',
  parameters: {
    type: Type.OBJECT,
    description: 'Remove uma parada de entrega existente pelo nome do cliente.',
    properties: {
      customerName: { type: Type.STRING, description: 'Nome do cliente da parada a ser removida.' }
    },
    required: ['customerName']
  }
};

const listStopsTool: FunctionDeclaration = {
  name: 'listCurrentStops',
  parameters: {
    type: Type.OBJECT,
    description: 'Lista todas as paradas da rota atual.',
    properties: {},
  }
};

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputNode: GainNode | null = null;
  private outputNode: GainNode | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private nextStartTime = 0;
  private session: any = null; // Using any for the session object as typed in guidelines implicitly
  private isConnected = false;

  // Callbacks to update React state
  private onAddStop: (args: AddStopArgs) => void;
  private onRemoveStop: (args: RemoveStopArgs) => void;
  private onListStops: () => string; // Returns JSON string of current stops
  private onStatusChange: (status: boolean) => void;
  private onAudioLevel: (level: number) => void;

  constructor(
    onAddStop: (args: AddStopArgs) => void,
    onRemoveStop: (args: RemoveStopArgs) => void,
    onListStops: () => string,
    onStatusChange: (status: boolean) => void,
    onAudioLevel: (level: number) => void
  ) {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    this.onAddStop = onAddStop;
    this.onRemoveStop = onRemoveStop;
    this.onListStops = onListStops;
    this.onStatusChange = onStatusChange;
    this.onAudioLevel = onAudioLevel;
  }

  public async connect() {
    if (this.isConnected) return;

    try {
      // Initialize Audio Contexts
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      this.inputNode = this.inputAudioContext.createGain();
      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);

      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connected');
            this.isConnected = true;
            this.onStatusChange(true);
            this.startAudioInputStream(sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
            this.handleMessage(message, sessionPromise);
          },
          onclose: () => {
            console.log('Gemini Live Closed');
            this.cleanup();
          },
          onerror: (err) => {
            console.error('Gemini Live Error', err);
            this.cleanup();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [addDeliveryStopTool, removeDeliveryStopTool, listStopsTool] }],
          systemInstruction: `Você é um assistente logístico útil e eficiente para o aplicativo "RotaFácil". 
          Ajude o motorista a gerenciar sua lista de entregas diárias. 
          Seja conciso, pois o usuário pode estar dirigindo.
          Fale português do Brasil de forma natural.
          Quando o usuário pedir para adicionar uma parada, pergunte os detalhes necessários se faltarem.
          Sempre confirme a ação verbalmente ("Certo, adicionei a parada para...").`
        }
      });

      this.session = sessionPromise;

    } catch (error) {
      console.error("Failed to connect to Gemini Live:", error);
      this.cleanup();
    }
  }

  public async disconnect() {
    if (this.session) {
        // session.close() isn't explicitly documented as synchronous or async in provided snippets,
        // but we should try to close it. 
        // Note: The guidelines say use session.close().
        const session = await this.session;
        session.close();
    }
    this.cleanup();
  }

  private startAudioInputStream(sessionPromise: Promise<any>) {
    if (!this.inputAudioContext || !this.mediaStream) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
    // Using script processor as per guidelines example (even though deprecated in web standards, standard for this API)
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (e) => {
      // Guidelines: Solely rely on sessionPromise resolves and then call `session.sendRealtimeInput`, **do not** add other condition checks.
      
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Simple volume meter logic
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onAudioLevel(rms);

      const pcmBlob = createPcmBlob(inputData);
      
      sessionPromise.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage, sessionPromise: Promise<any>) {
    // 1. Handle Tool Calls
    if (message.toolCall?.functionCalls) {
      for (const fc of message.toolCall.functionCalls) {
        let result: any = { result: "ok" };
        
        try {
          if (fc.name === 'addDeliveryStop') {
            const args = fc.args as unknown as AddStopArgs;
            this.onAddStop(args);
            result = { result: `Parada para ${args.customerName} adicionada com sucesso.` };
          } else if (fc.name === 'removeDeliveryStop') {
            const args = fc.args as unknown as RemoveStopArgs;
            this.onRemoveStop(args);
            result = { result: `Tentativa de remover parada de ${args.customerName} realizada.` };
          } else if (fc.name === 'listCurrentStops') {
            const stopsJson = this.onListStops();
            result = { stops: stopsJson };
          }
        } catch (e) {
          result = { error: "Erro ao executar comando no aplicativo." };
        }

        sessionPromise.then((session) => {
          session.sendToolResponse({
            functionResponses: {
              id: fc.id,
              name: fc.name,
              response: result
            }
          });
        });
      }
    }

    // 2. Handle Audio Output
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext && this.outputNode) {
      try {
        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
        
        const audioBuffer = await decodeAudioData(
          base64ToBytes(base64Audio),
          this.outputAudioContext,
          24000,
          1
        );

        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.outputNode);
        source.addEventListener('ended', () => {
            this.sources.delete(source);
        });

        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);
      } catch (e) {
        console.error("Error decoding audio", e);
      }
    }

    // 3. Handle Interruptions
    if (message.serverContent?.interrupted) {
      this.sources.forEach(source => {
        try { source.stop(); } catch(e) {}
      });
      this.sources.clear();
      this.nextStartTime = 0;
    }
  }

  private cleanup() {
    this.isConnected = false;
    this.onStatusChange(false);
    this.onAudioLevel(0);

    if (this.scriptProcessor) {
        this.scriptProcessor.disconnect();
        this.scriptProcessor = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }

    if (this.outputAudioContext) {
      this.sources.forEach(s => { try{s.stop()}catch(e){} });
      this.sources.clear();
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
  }
}