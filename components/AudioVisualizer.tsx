import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  level: number; // 0 to 1
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive, level }) => {
  const barsRef = useRef<HTMLDivElement[]>([]);
  
  // Animation loop for smoother visual effect based on level
  useEffect(() => {
    let animationFrameId: number;
    
    const animate = () => {
      if (!isActive) {
        barsRef.current.forEach(bar => {
           if(bar) bar.style.height = '4px';
        });
        return;
      }
      
      barsRef.current.forEach((bar, index) => {
        if (!bar) return;
        // Create a wave effect combined with the actual audio level
        const offset = index * 0.2;
        const time = Date.now() / 200;
        const wave = Math.sin(time + offset) * 0.5 + 0.5; // 0-1
        
        // Amplify the level for visual impact, min height 4px
        const height = 4 + (level * 80 * wave) + (Math.random() * 10 * level); 
        
        bar.style.height = `${Math.min(60, height)}px`;
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, level]);

  return (
    <div className="flex items-center justify-center gap-1 h-16 w-full">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          ref={(el) => { if(el) barsRef.current[i] = el; }}
          className={`w-2 rounded-full transition-colors duration-200 ${isActive ? 'bg-blue-500' : 'bg-slate-300'}`}
          style={{ height: '4px' }}
        />
      ))}
    </div>
  );
};

export default AudioVisualizer;