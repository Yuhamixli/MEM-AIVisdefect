/**
 * Detect @bot messages that are NOT real tasks (usage tips, empty pings).
 * Those must not resume a Cloud Agent — otherwise the group sees topic drift.
 */

const META_PATTERNS: RegExp[] = [
  /^$/u,
  /^(你好|在吗|在不在|hi|hello|hey)[!！.。?？\s]*$/iu,
  /^(当然|好的|可以|没问题|行)[，,、\s]*直接\s*@?/u,
  /^直接\s*@/u,
  /谁都可以.*(安排|给).*(活|任务)/u,
  /怎么.*(用|问|@)/u,
  /^(测试|test|ping)[!！.。\s]*$/iu,
];

export function isNonTaskMention(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 2) return true;
  // Pure mention residue after stripping @tokens
  if (/^(无文本|\(无文本\))$/u.test(t)) return true;
  return META_PATTERNS.some((re) => re.test(t));
}

export function helpNudge(): string {
  const options = [
    "在的。有具体问题直接说就行，例如：「相机布置文档在哪？」",
    "收到～我是查仓库用的。请带上要办的事，别只 @ 我名字。",
    "在。把任务写清楚再 @ 我；只提用法不用叫我跑一趟。",
  ];
  return options[Math.floor(Math.random() * options.length)]!;
}
