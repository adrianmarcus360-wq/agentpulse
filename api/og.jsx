import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const SIGNAL_LABELS = {
  funding:  'FUNDING',
  launch:   'LAUNCH',
  research: 'RESEARCH',
  jobs:     'JOBS',
  infra:    'INFRA/MCP',
  model:    'MODEL',
};

const SIGNAL_COLORS = {
  funding:  '#F59E0B',
  launch:   '#06B6D4',
  research: '#818CF8',
  jobs:     '#10B981',
  infra:    '#FB7185',
  model:    '#06B6D4',
};

export default function handler(request) {
  const { searchParams } = new URL(request.url);
  const title     = searchParams.get('title')  || 'AgentPulse';
  const type      = searchParams.get('type')   || 'funding';
  const meta      = searchParams.get('meta')   || 'AgentRoster · Real-time AI economy';
  const value     = searchParams.get('value')  || '';

  const color     = SIGNAL_COLORS[type] || SIGNAL_COLORS.launch;
  const typeLabel = SIGNAL_LABELS[type]  || 'SIGNAL';

  return new ImageResponse(
    /* eslint-disable react/react-in-jsx-scope */
    <div
      style={{
        width:  '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        background: '#0C0C18',
        fontFamily: '"Inter", sans-serif',
        padding: '0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background grid lines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(#1E1E3240 1px, transparent 1px), linear-gradient(90deg, #1E1E3240 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }} />

      {/* Glow orb */}
      <div style={{
        position: 'absolute',
        top: '-120px', right: '-80px',
        width: '480px', height: '480px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
      }} />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '52px 64px 0', position: 'relative', zIndex: 1 }}>
        {/* Signal type badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '28px',
        }}>
          <div style={{
            background: `${color}22`,
            border: `1px solid ${color}66`,
            borderRadius: '4px',
            padding: '4px 12px',
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: '13px',
            fontWeight: '600',
            color,
            letterSpacing: '0.1em',
          }}>
            {typeLabel}{value ? ` · ${value}` : ''}
          </div>
        </div>

        {/* Entity name */}
        <div style={{
          fontSize: title.length > 30 ? '52px' : '64px',
          fontWeight: '800',
          color: '#F1F5F9',
          lineHeight: 1.1,
          maxWidth: '800px',
          letterSpacing: '-0.02em',
        }}>
          {title}
        </div>

        {/* Detail line */}
        <div style={{
          marginTop: '20px',
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '16px',
          color: '#94A3B8',
          letterSpacing: '0.02em',
        }}>
          {meta}
        </div>
      </div>

      {/* Bottom strip */}
      <div style={{
        height: '56px',
        borderTop: '1px solid #1E1E32',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 64px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '13px',
          fontWeight: '600',
          color: '#E2E8F0',
          letterSpacing: '0.1em',
        }}>
          AGENTPULSE
        </div>
        <div style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: '11px',
          color: '#475569',
        }}>
          Powered by AgentRoster · 5,062 entities tracked
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [],
    }
  );
}
