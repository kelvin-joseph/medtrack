import { useEffect, useRef } from "react";
import QRCodeLib from "qrcode";

// Renders a genuinely scannable QR code (not a stylized placeholder).
// Encodes a secure asset reference (JSON with type+assetTag) rather than
// any clinical data, per the brief.
export default function QRCode({ value, size = 120 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const payload = JSON.stringify({ type: "medtrack-asset", assetTag: value });
    QRCodeLib.toCanvas(canvasRef.current, payload, {
      width: size,
      margin: 1,
      color: { dark: "#15304F", light: "#FFFFFF" },
    }).catch((err) => console.error("QR render failed:", err));
  }, [value, size]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size }} />;
}
