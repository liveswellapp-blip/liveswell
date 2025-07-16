import React, { useEffect, useRef } from 'react';

interface WindDirectionCompassProps {
  windDirection: string;
  windSpeed: string;
  className?: string;
}

export default function WindDirectionCompass({ windDirection, windSpeed, className = '' }: WindDirectionCompassProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const size = 120;
    canvas.width = size;
    canvas.height = size;
    const center = size / 2;
    const radius = size / 2 - 10;

    const getDirectionDegrees = (direction: string): number => {
      const directions: { [key: string]: number } = {
        'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
        'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
        'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
        'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
      };
      return directions[direction] || 0;
    };

    const directionDegrees = getDirectionDegrees(windDirection);
    const speed = parseFloat(windSpeed) || 0;

    let animationTime = 0;

    const animate = () => {
      animationTime += 0.02;
      
      ctx.clearRect(0, 0, size, size);
      
      // Draw compass circle
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw cardinal directions
      const directions = ['N', 'E', 'S', 'W'];
      const angles = [0, 90, 180, 270];
      
      directions.forEach((dir, index) => {
        const angle = angles[index];
        const x = center + Math.cos((angle - 90) * Math.PI / 180) * (radius - 15);
        const y = center + Math.sin((angle - 90) * Math.PI / 180) * (radius - 15);
        
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dir, x, y);
      });
      
      // Draw wind direction arrow with animation
      const arrowAngle = (directionDegrees + 180) * Math.PI / 180; // +180 because wind blows FROM direction
      const arrowLength = radius * 0.7;
      const pulse = Math.sin(animationTime * 3) * 0.1 + 0.9; // Pulsing effect
      
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(arrowAngle);
      
      // Arrow shaft
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -arrowLength * pulse);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // Arrow head
      ctx.beginPath();
      ctx.moveTo(0, -arrowLength * pulse);
      ctx.lineTo(-8, -arrowLength * pulse + 15);
      ctx.lineTo(8, -arrowLength * pulse + 15);
      ctx.closePath();
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      
      // Speed indicator rings
      const ringCount = Math.min(Math.floor(speed / 5), 5);
      for (let i = 0; i < ringCount; i++) {
        const ringRadius = 20 + i * 8;
        const ringOpacity = 0.3 - i * 0.05;
        const ringPulse = Math.sin(animationTime * 2 + i * 0.5) * 0.1 + 0.9;
        
        ctx.beginPath();
        ctx.arc(0, 0, ringRadius * ringPulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245, 158, 11, ${ringOpacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.restore();
      
      // Center dot
      ctx.beginPath();
      ctx.arc(center, center, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#374151';
      ctx.fill();
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [windDirection, windSpeed]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <canvas 
        ref={canvasRef}
        className="drop-shadow-md"
      />
      <div className="text-center mt-2">
        <div className="text-sm font-medium text-gray-700">{windDirection}</div>
        <div className="text-xs text-gray-500">{windSpeed} mph</div>
      </div>
    </div>
  );
}