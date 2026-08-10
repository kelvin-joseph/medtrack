export default function RiskGauge({ score, color, size = 132 }) {
  const angle = (Math.min(score, 100) / 100) * 180;
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  const needleRad = ((180 - angle) * Math.PI) / 180;
  const nx = cx + (r - 14) * Math.cos(needleRad);
  const ny = cy - (r - 14) * Math.sin(needleRad);

  const arcPath = (startDeg, endDeg) => {
    const s = ((180 - startDeg) * Math.PI) / 180;
    const e = ((180 - endDeg) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(s), y1 = cy - r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy - r * Math.sin(e);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  return (
    <svg width={size} height={size / 2 + 24} viewBox={`0 0 ${size} ${size / 2 + 24}`}>
      <path d={arcPath(0, 180)} fill="none" stroke="#DCE7F3" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(0, 20)} fill="none" stroke="#1F9D6B" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(20, 40)} fill="none" stroke="#5FB88B" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(40, 60)} fill="none" stroke="#D89A1F" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(60, 80)} fill="none" stroke="#E07A2F" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(80, 100)} fill="none" stroke="#D9364B" strokeWidth="10" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#15304F" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5" fill="#15304F" />
      <text x={cx} y={cy - 22} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="24" fontWeight="600" fill={color}>
        {score}
      </text>
    </svg>
  );
}
