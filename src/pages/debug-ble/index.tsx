import { useCallback, useEffect, useState } from 'react';
import { useBleMetrics, BUCKETS } from '../../stores/bleMetrics';
import { Card } from '../../components/ui/Card';

const COLORS = {
  write: '#4ade80',
  read: '#60a5fa',
  poll: '#a78bfa',
  error: '#f87171',
};

const CHAR_NAMES: Record<string, string> = {
  fff1: '档位', fff2: '定时', fff3: '转速', fff4: '自然风', fff5: '休眠', fff6: '减档', fff7: '校准',
  ffd1: '电池', ffd2: '电源', ffd3: '电机', ffd4: '寄存器',
  ffe3: '曲线',
  fee1: 'DFU写', fee2: 'DFU通知',
};

export default function DebugBlePage() {
  const metrics = useBleMetrics();
  const [, setTick] = useState(0);

  // Force re-render periodically for live updates
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const avgLatency = useCallback((filter: string) => {
    const ops = metrics.ops.filter(o => !filter || o.type === filter);
    if (ops.length === 0) return 0;
    return Math.round(ops.reduce((a, b) => a + b.duration, 0) / ops.length);
  }, [metrics.ops]);

  const p95 = useCallback(() => {
    const all = metrics.ops.filter(o => !o.error).map(o => o.duration).sort((a, b) => a - b);
    if (all.length === 0) return 0;
    return all[Math.ceil(all.length * 0.95) - 1]!;
  }, [metrics.ops]);

  const p99 = useCallback(() => {
    const all = metrics.ops.filter(o => !o.error).map(o => o.duration).sort((a, b) => a - b);
    if (all.length === 0) return 0;
    return all[Math.ceil(all.length * 0.99) - 1]!;
  }, [metrics.ops]);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 0' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>BLE 性能分析</h2>

      {/* 概览卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {[
          { label: '写操作', value: metrics.total.writes, color: COLORS.write },
          { label: '读操作', value: metrics.total.reads, color: COLORS.read },
          { label: '轮询周期', value: metrics.total.polls, color: COLORS.poll },
          { label: '错误', value: metrics.total.errors, color: COLORS.error },
        ].map(c => (
          <div
            key={c.label}
            style={{
              background: 'var(--color-bg-inset)',
              borderRadius: 8,
              padding: '10px 12px',
              textAlign: 'center',
              borderTop: `3px solid ${c.color}`,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700 }}>{c.value}</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* 延迟统计 */}
      <Card title="操作延迟分布" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 11, opacity: 0.6 }}>
          <span>写: {avgLatency('write')}ms</span>
          <span>读: {avgLatency('read')}ms</span>
          <span>P95: {p95()}ms</span>
          <span>P99: {p99()}ms</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
          {BUCKETS.map((b, i) => {
            const count = metrics.latencyBuckets[i] ?? 0;
            const maxB = Math.max(...metrics.latencyBuckets, 1);
            const barH = (count / maxB) * 48;
            const label = b === Infinity ? '≥1000' : `<${b}`;
            return (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{count}</div>
                <div style={{
                  height: barH, background: COLORS.write, borderRadius: '2px 2px 0 0',
                  margin: '0 auto', width: '70%', transition: 'height 0.3s',
                }} />
                <div style={{ fontSize: 9, opacity: 0.5, marginTop: 2 }}>{label}ms</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 按特征统计 */}
      <Card title="按特征平均耗时" style={{ marginBottom: 16 }}>
        {(() => {
          const groups: Record<string, { sum: number; cnt: number; max: number; type: string }> = {};
          for (const op of metrics.ops) {
            if (op.error) continue;
            const key = op.charId;
            if (!groups[key]) groups[key] = { sum: 0, cnt: 0, max: 0, type: op.type };
            groups[key]!.sum += op.duration;
            groups[key]!.cnt++;
            groups[key]!.max = Math.max(groups[key]!.max, op.duration);
          }
          const entries = Object.entries(groups).sort((a, b) => (b[1].sum / b[1].cnt) - (a[1].sum / a[1].cnt));
          if (entries.length === 0) return <div style={{ opacity: 0.4, fontSize: 12, padding: 8 }}>无数据</div>;
          const maxAvg = Math.max(...entries.map(([, g]) => g.sum / g.cnt), 1);
          const maxMax = Math.max(...entries.map(([, g]) => g.max), 1);
          return (
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ opacity: 0.5, textAlign: 'left' }}>
                  <th style={{ padding: '3px 6px' }}>名称</th>
                  <th style={{ padding: '3px 6px' }}>类型</th>
                  <th style={{ padding: '3px 6px' }}>次数</th>
                  <th style={{ padding: '3px 6px' }}>平均</th>
                  <th style={{ padding: '3px 6px' }}>最大</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([char, g]) => {
                  const avg = Math.round(g.sum / g.cnt);
                  const color = g.type === 'write' ? COLORS.write : g.type === 'read' ? COLORS.read : COLORS.poll;
                  const name = CHAR_NAMES[char] ?? char.toUpperCase();
                  const typeLabel = g.type === 'write' ? '写' : g.type === 'read' ? '读' : '轮询';
                  return (
                    <tr key={char} style={{ borderTop: '0.5px solid var(--color-border)' }}>
                      <td style={{ padding: '3px 6px', fontWeight: 600 }}>{name}</td>
                      <td style={{ padding: '3px 6px', color }}>{typeLabel}</td>
                      <td style={{ padding: '3px 6px', opacity: 0.4 }}>{g.cnt}</td>
                      <td style={{ padding: '3px 6px' }}>
                        <span style={{ fontWeight: 600 }}>{avg}ms</span>
                        <div style={{ height: 4, background: 'var(--color-bg-inset)', borderRadius: 2, marginTop: 2, width: 80 }}>
                          <div style={{ height: '100%', width: `${(avg / maxAvg) * 100}%`, background: color, borderRadius: 2 }} />
                        </div>
                      </td>
                      <td style={{ padding: '3px 6px', opacity: 0.6 }}>
                        {g.max}ms
                        <div style={{ height: 3, background: 'var(--color-bg-inset)', borderRadius: 2, marginTop: 2, width: 60 }}>
                          <div style={{ height: '100%', width: `${(g.max / maxMax) * 100}%`, background: color, borderRadius: 2, opacity: 0.5 }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          );
        })()}
      </Card>

      {/* 最近操作 */}
      <Card title="最近操作" style={{ marginBottom: 16 }}>
        <div style={{ maxHeight: 300, overflowY: 'auto', fontSize: 11, fontFamily: 'monospace' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ opacity: 0.5, textAlign: 'left' }}>
                <th style={{ padding: '4px 8px', width: 80 }}>类型</th>
                <th style={{ padding: '4px 8px', width: 130 }}>特征</th>
                <th style={{ padding: '4px 8px', width: 50 }}>大小</th>
                <th style={{ padding: '4px 8px', width: 60 }}>耗时</th>
                <th style={{ padding: '4px 8px' }}>错误</th>
              </tr>
            </thead>
            <tbody>
              {metrics.ops.slice(-30).reverse().map((op, i) => (
                <tr
                  key={i}
                  style={{
                    borderTop: '0.5px solid var(--color-border)',
                    background: op.error ? 'var(--color-danger-bg)' : undefined,
                  }}
                >
                  <td style={{ padding: '3px 8px', color: COLORS[op.type] }}>
                    {op.type === 'write' ? '写' : op.type === 'read' ? '读' : '轮询'}
                  </td>
                  <td style={{ padding: '3px 8px' }}>
                    {op.charId} <span style={{ opacity: 0.5 }}>{CHAR_NAMES[op.charId] ?? ''}</span>
                  </td>
                  <td style={{ padding: '3px 8px' }}>{op.size > 0 ? op.size + 'B' : '-'}</td>
                  <td style={{ padding: '3px 8px', color: op.duration > 100 ? COLORS.error : undefined }}>
                    {op.duration}ms
                  </td>
                  <td style={{ padding: '3px 8px', color: COLORS.error, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {op.error || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 重置 */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => metrics.reset()}
          style={{
            padding: '6px 16px', borderRadius: 6, border: '1px solid var(--color-border)',
            fontSize: 12, cursor: 'pointer', background: 'transparent', color: 'var(--color-text)',
          }}
        >
          重置统计
        </button>
      </div>
    </div>
  );
}
