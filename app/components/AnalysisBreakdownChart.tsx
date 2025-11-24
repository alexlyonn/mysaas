'use client';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface BreakdownData {
  clarity: number;
  differentiation: number;
  friction: number;
  cta_strength: number;
  value_proof: number;
  offer_architecture: number;
}

interface Props {
  data: BreakdownData;
}

// Veri anahtarlarını kullanıcı dostu etiketlere çeviren harita
const nameMapping: { [key in keyof BreakdownData]: string } = {
  clarity: 'Netlik',
  differentiation: 'Farklılaşma',
  friction: 'Engeller',
  cta_strength: 'CTA Gücü',
  value_proof: 'Değer Kanıtı',
  offer_architecture: 'Teklif Yapısı',
};

export default function AnalysisBreakdownChart({ data }: Props) {
  // Recharts'ın beklediği formata veriyi dönüştür
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: nameMapping[key as keyof BreakdownData] || key,
    puan: value,
  }));

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <RadarChart 
          cx="50%" 
          cy="50%" 
          outerRadius="80%" 
          data={chartData}
        >
          <PolarGrid stroke="rgba(255, 255, 255, 0.2)" />
          <PolarAngleAxis 
            dataKey="name" 
            stroke="#9ca3af"
            tickLine={false}
            fontSize={13}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 10]} 
            stroke="#4b5563"
            axisLine={false}
            tick={false}
          />
          <Radar name="Puan" dataKey="puan" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
          <Tooltip cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#d1d5db' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}