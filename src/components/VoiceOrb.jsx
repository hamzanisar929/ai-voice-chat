import React, { useEffect, useRef } from 'react';

const ORB_RADIUS = 64; // Increased size for prominence

// Helper to draw a wavy band
function drawWavyBand(ctx, cx, cy, radius, options = {}) {
  const {
    bandWidth = 18,
    amplitude = 8,
    frequency = 2.2,
    phase = 0,
    color1 = '#e3f6fd',
    color2 = '#3390ff',
  } = options;

  ctx.save();
  ctx.beginPath();
  for (let a = 0; a <= Math.PI; a += 0.01) {
    const y = cy + Math.sin(a * frequency + phase) * amplitude;
    const x = cx + Math.cos(a) * radius;
    ctx.lineTo(x, y + Math.sin(a * frequency + phase) * amplitude);
  }
  for (let a = Math.PI; a >= 0; a -= 0.01) {
    const y = cy + Math.sin(a * frequency + phase) * amplitude + bandWidth;
    const x = cx + Math.cos(a) * (radius - bandWidth);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  const grad = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.fillStyle = grad;
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

const VoiceOrb = ({ isListening, isSpeaking }) => {
  const canvasRef = useRef(null);
  const isActive = isListening || isSpeaking;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let waves = [];
    let phase = 0;
    let loadingParticles = Array.from({ length: 12 }, (_, i) => ({
      angle: (i * Math.PI * 2) / 12,
      speed: 0.05,
      radius: 80,
      opacity: 1,
    }));

    const createWave = () => ({
      radius: 80, // Increased base radius
      opacity: 0.6,
      width: 4,
      hue: Math.random() * 60 + 200, // Blue to purple range
    });

    const handleResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const drawWave = (wave) => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      ctx.beginPath();
      ctx.strokeStyle = `hsla(${wave.hue}, 70%, 60%, ${wave.opacity})`;
      ctx.lineWidth = wave.width;
      
      for (let i = 0; i < 360; i++) {
        const angle = (i * Math.PI) / 180;
        const amplitude = isActive ? 8 + Math.sin(phase + i / 20) * 5 : 3;
        const radius = wave.radius + amplitude;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      ctx.stroke();
    };

    const drawLoadingAnimation = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      loadingParticles.forEach((particle, i) => {
        const x = cx + Math.cos(particle.angle) * particle.radius;
        const y = cy + Math.sin(particle.angle) * particle.radius;
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${200 + i * 10}, 70%, 60%, ${particle.opacity})`;
        ctx.fill();

        // Update particle
        particle.angle += particle.speed;
        particle.opacity = 0.3 + Math.sin(phase + i / 2) * 0.7;
        particle.radius = 80 + Math.sin(phase + i / 3) * 10;
      });
    };

    const drawOrb = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      // Create gradient for orb
      const gradient = ctx.createRadialGradient(
        cx, cy - 40, 0,
        cx, cy, 100 // Increased size
      );
      
      gradient.addColorStop(0, isListening ? '#ff3366' : isSpeaking ? '#3366ff' : '#6633ff');
      gradient.addColorStop(0.5, isListening ? '#ff336680' : isSpeaking ? '#3366ff80' : '#6633ff80');
      gradient.addColorStop(1, isListening ? '#ff336610' : isSpeaking ? '#3366ff10' : '#6633ff10');

      // Draw main orb
      ctx.beginPath();
      ctx.arc(cx, cy, 80, 0, Math.PI * 2); // Increased size
      ctx.fillStyle = gradient;
      ctx.fill();

      // Add highlight
      const highlightGradient = ctx.createRadialGradient(
        cx - 30, cy - 30, 0,
        cx - 30, cy - 30, 60
      );
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.beginPath();
      ctx.arc(cx - 30, cy - 30, 30, 0, Math.PI * 2);
      ctx.fillStyle = highlightGradient;
      ctx.fill();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw loading animation when speaking
      if (isSpeaking) {
        drawLoadingAnimation();
      }

      // Update and draw waves
      waves.forEach((wave, i) => {
        wave.radius += 0.8;
        wave.opacity -= 0.008;
        wave.width *= 0.99;
        
        if (wave.opacity > 0) {
          drawWave(wave);
        }
      });

      // Remove faded waves
      waves = waves.filter(wave => wave.opacity > 0);

      // Add new waves periodically
      if (isActive && Math.random() < 0.1) {
        waves.push(createWave());
      }

      // Draw the central orb
      drawOrb();

      // Update phase for wave animation
      phase += isActive ? 0.03 : 0.01;

      animationFrameId = requestAnimationFrame(animate);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isListening, isSpeaking, isActive]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-[300px] h-[300px]" // Increased size
        style={{ 
          transition: 'all 0.3s ease-in-out'
        }}
      />
    </div>
  );
};

export default VoiceOrb; 