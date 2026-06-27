import { Card } from '../../components/ui/Card';
import { DashboardGrid } from '../../components/ui/DashboardGrid';
import type { ResponsiveLayouts } from 'react-grid-layout';

const HISTORY_LAYOUTS: ResponsiveLayouts = {
  lg: [{ i: 'placeholder', x: 0, y: 0, w: 12, h: 8 }],
  md: [{ i: 'placeholder', x: 0, y: 0, w: 10, h: 8 }],
  sm: [{ i: 'placeholder', x: 0, y: 0, w: 6, h: 8 }],
  xs: [{ i: 'placeholder', x: 0, y: 0, w: 2, h: 8 }],
};

export default function History() {
  return (
    <DashboardGrid pageKey="history" defaultLayouts={HISTORY_LAYOUTS}>
      <Card key="placeholder" title="历史数据" subtitle="功能开发中" dragHandle>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
          历史数据图表功能将在后续版本提供
        </div>
      </Card>
    </DashboardGrid>
  );
}
