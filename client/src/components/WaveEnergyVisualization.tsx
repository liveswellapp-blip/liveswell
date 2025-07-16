import React, { useEffect, useRef } from 'react';
import { SurfConditions } from '@/types/weather';

interface WaveEnergyVisualizationProps {
  conditions: SurfConditions;
  className?: string;
}

export default function WaveEnergyVisualization({ conditions, className = '' }: WaveEnergyVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation parameters
    const waveHeight = parseFloat(conditions.waveHeight) || 2;
    const windSpeed = parseFloat(conditions.windSpeed) || 5;
    const windDirection = getWindDirectionDegrees(conditions.windDirection);

    const animate = () => {
      timeRef.current += 0.02;
      
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Draw wave energy visualization
      drawWaveEnergy(ctx, width, height, waveHeight, timeRef.current);
      
      // Draw wind direction arrows
      drawWindDirection(ctx, width, height, windSpeed, windDirection, timeRef.current);
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [conditions]);

  const getWindDirectionDegrees = (direction: string): number => {
    const directions: { [key: string]: number } = {
      'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
      'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
      'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
      'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
    };
    return directions[direction] || 0;
  };

  const drawWaveEnergy = (ctx: CanvasRenderingContext2D, width: number, height: number, waveHeight: number, time: number) => {
    const centerY = height / 2;
    const amplitude = Math.min(waveHeight * 8, height * 0.3);
    const frequency = 0.02;
    const speed = 2;

    // Create gradient for wave energy
    const gradient = ctx.createLinearGradient(0, centerY - amplitude, 0, centerY + amplitude);
    gradient.addColorStop(0, 'rgba(64, 135, 241, 0.8)');
    gradient.addColorStop(0.5, 'rgba(64, 135, 241, 0.4)');
    gradient.addColorStop(1, 'rgba(64, 135, 241, 0.1)');

    // Draw multiple wave layers for energy effect
    for (let layer = 0; layer < 3; layer++) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(64, 135, 241, ${0.6 - layer * 0.2})`;
      ctx.lineWidth = 3 - layer;
      
      for (let x = 0; x <= width; x += 2) {
        const layerOffset = layer * 0.3;
        const y = centerY + Math.sin(x * frequency + time * speed + layerOffset) * amplitude * (1 - layer * 0.2);
        
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
    }

    // Add wave energy particles
    drawWaveParticles(ctx, width, height, waveHeight, time);
  };

  const drawWaveParticles = (ctx: CanvasRenderingContext2D, width: number, height: number, waveHeight: number, time: number) => {
    const particleCount = Math.floor(waveHeight * 5);
    
    for (let i = 0; i < particleCount; i++) {
      const x = (i * 50 + time * 30) % width;
      const baseY = height / 2;
      const y = baseY + Math.sin(x * 0.02 + time * 2 + i) * waveHeight * 6;
      const size = Math.sin(time + i) * 2 + 3;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(64, 135, 241, ${0.5 + Math.sin(time + i) * 0.3})`;
      ctx.fill();
    }
  };

  const drawWindDirection = (ctx: CanvasRenderingContext2D, width: number, height: number, windSpeed: number, windDirection: number, time: number) => {
    const arrowCount = Math.min(Math.floor(windSpeed / 2), 8);
    const arrowSpacing = width / (arrowCount + 1);
    
    for (let i = 0; i < arrowCount; i++) {
      const x = arrowSpacing * (i + 1);
      const y = height * 0.2 + Math.sin(time + i * 0.5) * 10;
      
      drawWindArrow(ctx, x, y, windDirection, windSpeed, time + i * 0.3);
    }
  };

  const drawWindArrow = (ctx: CanvasRenderingContext2D, x: number, y: number, direction: number, speed: number, time: number) => {
    const length = Math.min(speed * 3, 40);
    const opacity = 0.6 + Math.sin(time * 2) * 0.2;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((direction + 180) * Math.PI / 180); // +180 because wind direction is "from" not "to"
    
    // Arrow body
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -length);
    ctx.strokeStyle = `rgba(255, 140, 0, ${opacity})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Arrow head
    ctx.beginPath();
    ctx.moveTo(0, -length);
    ctx.lineTo(-8, -length + 12);
    ctx.lineTo(8, -length + 12);
    ctx.closePath();
    ctx.fillStyle = `rgba(255, 140, 0, ${opacity})`;
    ctx.fill();
    
    // Wind speed indicator (circle)
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 140, 0, ${opacity * 0.7})`;
    ctx.fill();
    
    ctx.restore();
  };

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      <canvas 
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      
      {/* Legend */}
      <div className="absolute bottom-2 left-2 text-xs text-white bg-black bg-opacity-50 rounded px-2 py-1">
        <div className="flex items-center mb-1">
          <div className="w-3 h-1 bg-blue-400 mr-2"></div>
          <span>Wave Energy</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-orange-400 mr-2 transform rotate-45"></div>
          <span>Wind Direction</span>
        </div>
      </div>
    </div>
  );
}