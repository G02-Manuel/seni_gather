import React, { useEffect, useRef, useState } from 'react';
import { WhiteboardStroke } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  open: boolean;
  onClose: () => void;
  history: WhiteboardStroke[];
  onStroke: (s: WhiteboardStroke) => void;
  onClear: () => void;
  authorId: string;
}

const COLORS = ['#000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
const SIZES = [2, 4, 8];

const Whiteboard: React.FC<Props> = ({ open, onClose, history, onStroke, onClear, authorId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const points = useRef<{ x: number; y: number }[]>([]);
  const [color, setColor] = useState('#000');
  const [size, setSize] = useState(4);

  useEffect(() => {
    if (!open) return;
    redraw();
  }, [open, history]);

  function redraw() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of history) drawStroke(ctx, s);
  }

  function drawStroke(ctx: CanvasRenderingContext2D, s: WhiteboardStroke) {
    if (s.points.length === 0) return;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.size;
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
    ctx.stroke();
  }

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const ev: any = 'touches' in e ? e.touches[0] : e;
    return { x: ((ev.clientX - rect.left) / rect.width) * c.width, y: ((ev.clientY - rect.top) / rect.height) * c.height };
  }

  function start(e: React.MouseEvent | React.TouchEvent) {
    drawing.current = true;
    points.current = [getPos(e)];
  }
  function move(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    const p = getPos(e);
    points.current.push(p);
    const ctx = canvasRef.current!.getContext('2d')!;
    drawStroke(ctx, { id: 'tmp', authorId, color, size, points: points.current });
  }
  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (points.current.length < 2) { points.current = []; return; }
    onStroke({ id: uuidv4(), authorId, color, size, points: [...points.current] });
    points.current = [];
  }

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2>🖊️ Pizarra colaborativa</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </header>
        <div className="wb-toolbar">
          {COLORS.map(c => (
            <button key={c} className={`wb-color ${c === color ? 'active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
          ))}
          <span className="sep" />
          {SIZES.map(s => (
            <button key={s} className={`wb-size ${s === size ? 'active' : ''}`} onClick={() => setSize(s)}>
              <span style={{ width: s * 2, height: s * 2 }} />
            </button>
          ))}
          <span className="sep" />
          <button className="btn-secondary" onClick={onClear}>Limpiar</button>
        </div>
        <canvas
          ref={canvasRef}
          width={1024}
          height={600}
          className="wb-canvas"
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
      </div>
    </div>
  );
};

export default Whiteboard;
