/**
 * TUI 主界面：状态面板（500ms 轮询快照）+ 日志面板 + 命令输入行。
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import type { DeviceSession, SessionState } from '../core/session.js';
import type { BleSnapshot } from '@gggxbbb/w96p-ble-sdk';
import { executeLine, type CommandContext } from '../core/commands.js';
import { formatStatusLines } from '../core/formatStatus.js';
import { cmdLogStore, diagLogStore } from './logStore.js';
import { pickerStore } from './pickerStore.js';

export function App({
  session,
  connectDevice,
}: {
  session: DeviceSession;
  connectDevice: () => Promise<void>;
}) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const [input, setInput] = useState('');
  const [snapshot, setSnapshot] = useState<BleSnapshot>(session.snapshot);
  const [sstate, setSstate] = useState<SessionState>(session.sessionState);
  const [selIdx, setSelIdx] = useState(0);
  const cmdLines = useSyncExternalStore(cmdLogStore.subscribe, cmdLogStore.getLines);
  const diagLines = useSyncExternalStore(diagLogStore.subscribe, diagLogStore.getLines);
  const candidates = useSyncExternalStore(pickerStore.subscribe, pickerStore.getCandidates);

  useEffect(() => session.onSnapshot(setSnapshot), [session]);
  useEffect(() => session.onState(setSstate), [session]);

  // 扫描中无候选 → scan；有候选 → pick（方向键菜单）；否则正常输入
  const scanning = sstate.state === 'connecting';
  const phase = scanning ? (candidates.length > 0 ? 'pick' : 'scan') : 'normal';

  // 仅一台候选时 2s 后自动选中
  useEffect(() => {
    if (phase !== 'pick' || candidates.length !== 1) return;
    const t = setTimeout(() => candidates[0]!.select(), 2000);
    return () => clearTimeout(t);
  }, [phase, candidates]);

  // 候选收缩时夹住选中下标
  useEffect(() => {
    setSelIdx((i) => Math.max(0, Math.min(i, candidates.length - 1)));
  }, [candidates.length]);

  const ctx = useMemo<CommandContext>(
    () => ({
      session,
      connectDevice,
      log: (line) => cmdLogStore.push(line),
      clearLog: () => {
        cmdLogStore.clear();
        diagLogStore.clear();
      },
      requestExit: () => exit(),
    }),
    [session, connectDevice, exit],
  );

  useInput((ch, key) => {
    if (key.ctrl && ch === 'c') {
      exit();
      return;
    }
    if (phase === 'pick') {
      if (key.upArrow) setSelIdx((i) => Math.max(0, i - 1));
      else if (key.downArrow) setSelIdx((i) => Math.min(candidates.length - 1, i + 1));
      else if (key.return) candidates[selIdx]?.select();
    }
  });

  const onSubmit = (value: string): void => {
    setInput('');
    void executeLine(value, ctx);
  };

  // 按终端高度裁剪渲染行数——Yoga 的 flex 子项最小高度默认取内容高度，
  // 行数不裁剪会把日志/诊断面板一路撑高、挤压其他区域
  const rows = stdout?.rows ?? 24;
  const statusLines = formatStatusLines(sstate, snapshot);
  const bottomRows = phase === 'pick' ? candidates.length + 3 : 1;
  const logContentRows = Math.max(1, rows - statusLines.length - 2 - bottomRows - 3);
  const visibleCmd = cmdLines.slice(-logContentRows);
  const visibleDiag = diagLines.slice(-logContentRows);

  return (
    <Box flexDirection="column" height={rows}>
      <Box
        borderStyle="round"
        borderColor={sstate.connected ? 'green' : 'gray'}
        flexDirection="column"
        paddingX={1}
      >
        {statusLines.map((line, i) => (
          <Text key={i} wrap="truncate">
            {line}
          </Text>
        ))}
      </Box>
      <Box flexGrow={1}>
        <Box
          borderStyle="round"
          borderColor="gray"
          flexDirection="column"
          flexGrow={2}
          overflow="hidden"
          paddingX={1}
        >
          <Text dimColor>日志</Text>
          <Box flexDirection="column" flexGrow={1} justifyContent="flex-end">
            {visibleCmd.map((line, i) => (
              <Text key={i} wrap="truncate">
                {line}
              </Text>
            ))}
          </Box>
        </Box>
        <Box
          borderStyle="round"
          borderColor="gray"
          flexDirection="column"
          flexGrow={1}
          overflow="hidden"
          paddingX={1}
        >
          <Text dimColor>诊断</Text>
          <Box flexDirection="column" flexGrow={1} justifyContent="flex-end">
            {visibleDiag.map((line, i) => (
              <Text key={i} wrap="truncate" dimColor>
                {line}
              </Text>
            ))}
          </Box>
        </Box>
      </Box>
      {phase === 'pick' ? (
        <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
          <Text color="cyan">选择设备（↑↓ 移动，回车连接）:</Text>
          {candidates.map((c, i) => (
            <Text key={c.id} color={i === selIdx ? 'green' : undefined}>
              {i === selIdx ? '❯ ' : '  '}
              {c.name ?? '(无名)'}  {c.id}
            </Text>
          ))}
        </Box>
      ) : phase === 'scan' ? (
        <Box>
          <Text dimColor>扫描中…（无结果时请确认设备已开机并在附近）</Text>
        </Box>
      ) : (
        <Box>
          <Text color="cyan">w96p&gt; </Text>
          <TextInput value={input} onChange={setInput} onSubmit={onSubmit} />
        </Box>
      )}
    </Box>
  );
}
