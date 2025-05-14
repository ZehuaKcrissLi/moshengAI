export interface FunctionCall {
  action: 'recommend_voice_styles' | 'tts_preview' | 'tts_final';
  args: Record<string, unknown>;
}

// 从文本中提取所有函数调用
export function parseFunctionCalls(text: string): FunctionCall[] {
  const calls: FunctionCall[] = [];
  // 约定模型输出用 <<< {...} >>> 包裹 JSON 指令
  const regex = /<<<([\s\S]*?)>>>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    try {
      const obj = JSON.parse(match[1]);
      if (obj && obj.action) {
        calls.push({ action: obj.action, args: obj });
      }
    } catch (e) {
      console.error('解析函数调用JSON失败', e);
    }
  }
  return calls;
} 