import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Deal Overview';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 32,
              color: '#a78bfa',
              fontWeight: 500,
              letterSpacing: '0.1em',
              marginBottom: 20,
            }}
          >
            DEAL OVERVIEW
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: 'white',
              textAlign: 'center',
              marginBottom: 10,
            }}
          >
            Viral Content Engine
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              background: 'linear-gradient(90deg, #a78bfa 0%, #f472b6 100%)',
              backgroundClip: 'text',
              color: 'transparent',
              textAlign: 'center',
            }}
          >
            Monetized Through DTC
          </div>
          <div
            style={{
              display: 'flex',
              gap: 60,
              marginTop: 60,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 700, color: '#a78bfa' }}>$1.8M</div>
              <div style={{ fontSize: 18, color: '#64748b', marginTop: 8 }}>EBITDA Run Rate</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 700, color: '#34d399' }}>70M</div>
              <div style={{ fontSize: 18, color: '#64748b', marginTop: 8 }}>Monthly Views</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 700, color: '#f472b6' }}>28%</div>
              <div style={{ fontSize: 18, color: '#64748b', marginTop: 8 }}>EBITDA Margin</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
