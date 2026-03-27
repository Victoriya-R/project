import { useMemo, useState } from 'react';
import { FloorPlan, FloorPlanRack } from '../../types/entities';

type Props = {
  floorPlan: FloorPlan;
  selectedRackId: number | null;
  onSelectRack: (rack: FloorPlanRack) => void;
};

export function FloorPlanScene({ floorPlan, selectedRackId, onSelectRack }: Props) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(24);

  const racks = floorPlan.racks ?? [];

  const scale = useMemo(() => {
    const maxSize = Math.max(floorPlan.width, floorPlan.depth, 1);
    return Math.max(20, 420 / maxSize);
  }, [floorPlan.depth, floorPlan.width]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">Zoom
          <input type="range" min={0.6} max={1.7} step={0.05} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
        </label>
        <label className="flex items-center gap-2">Поворот
          <input type="range" min={0} max={65} step={1} value={rotation} onChange={(event) => setRotation(Number(event.target.value))} />
        </label>
        <span className="text-slate-500">Кликните по стойке для 2D просмотра.</span>
      </div>

      <div className="relative h-[420px] overflow-hidden rounded-2xl border border-slate-100 bg-slate-950/95 p-4">
        <div
          className="absolute left-1/2 top-1/2"
          style={{
            transform: `translate(-50%, -50%) scale(${zoom}) perspective(920px) rotateX(62deg) rotateZ(${rotation}deg)`,
            transformStyle: 'preserve-3d'
          }}
        >
          <div
            className="relative rounded-md border border-white/30 bg-slate-700/80"
            style={{
              width: `${floorPlan.width * scale}px`,
              height: `${floorPlan.depth * scale}px`
            }}
          >
            {racks.map((rack) => {
              const isSelected = selectedRackId === rack.id;
              return (
                <button
                  key={rack.id}
                  type="button"
                  onClick={() => onSelectRack(rack)}
                  title={`${rack.name} · ${rack.equipment.length} ед.`}
                  className={`absolute rounded border text-[10px] font-semibold text-white transition ${isSelected ? 'border-cyan-200 bg-cyan-500/80' : 'border-brand-300 bg-brand-500/80 hover:bg-brand-400/80'}`}
                  style={{
                    left: `${rack.x * scale}px`,
                    top: `${rack.z * scale}px`,
                    width: `${Math.max(rack.width * scale, 16)}px`,
                    height: `${Math.max(rack.depth * scale, 12)}px`,
                    transform: `rotate(${rack.rotation_y}deg)`
                  }}
                >
                  {rack.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
