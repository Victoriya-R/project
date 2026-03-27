import { useMemo, useRef, useState } from 'react';
import { FloorPlan, FloorPlanRack } from '../../types/entities';

type DragPayload = {
  rackId: number;
  x: number;
  z: number;
};

type Props = {
  floorPlan: FloorPlan;
  selectedRackId: number | null;
  mode: '2d' | '3d';
  onModeChange: (mode: '2d' | '3d') => void;
  onSelectRack: (rack: FloorPlanRack) => void;
  onRackPositionCommit: (payload: DragPayload) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function FloorPlanScene({
  floorPlan,
  selectedRackId,
  mode,
  onModeChange,
  onSelectRack,
  onRackPositionCommit
}: Props) {
  const [zoom2d, setZoom2d] = useState(1);
  const [zoom3d, setZoom3d] = useState(1);
  const [rotation3d, setRotation3d] = useState(28);
  const [hoveredRackId, setHoveredRackId] = useState<number | null>(null);
  const [draggingRackId, setDraggingRackId] = useState<number | null>(null);
  const roomRef = useRef<HTMLDivElement | null>(null);

  const racks = floorPlan.racks ?? [];
  const hoveredRack = racks.find((rack) => rack.id === hoveredRackId) ?? null;

  const meterToPixel = useMemo(() => {
    const canvasWidth = 760;
    return canvasWidth / Math.max(floorPlan.width, 1);
  }, [floorPlan.width]);

  const roomPixelWidth = floorPlan.width * meterToPixel;
  const roomPixelDepth = floorPlan.depth * meterToPixel;

  const panelPixelX = Math.max(10, floorPlan.panel_size_x * meterToPixel);
  const panelPixelY = Math.max(10, floorPlan.panel_size_y * meterToPixel);

  const snapToGrid = (px: number, panelSizeInPx: number) => Math.round(px / panelSizeInPx) * panelSizeInPx;

  const handleDragMove = (event: React.PointerEvent, rack: FloorPlanRack) => {
    if (draggingRackId !== rack.id || !roomRef.current) {
      return;
    }

    const bounds = roomRef.current.getBoundingClientRect();
    const rackWidthPx = rack.width * meterToPixel;
    const rackDepthPx = rack.depth * meterToPixel;

    const localX = clamp(event.clientX - bounds.left - rackWidthPx / 2, 0, bounds.width - rackWidthPx);
    const localY = clamp(event.clientY - bounds.top - rackDepthPx / 2, 0, bounds.height - rackDepthPx);

    const snappedX = snapToGrid(localX, panelPixelX);
    const snappedY = snapToGrid(localY, panelPixelY);

    const snappedMetersX = Number((snappedX / meterToPixel).toFixed(2));
    const snappedMetersZ = Number((snappedY / meterToPixel).toFixed(2));

    onRackPositionCommit({ rackId: rack.id, x: snappedMetersX, z: snappedMetersZ });
  };

  const selectedRack = racks.find((rack) => rack.id === selectedRackId) ?? null;

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm">
          <button
            type="button"
            onClick={() => onModeChange('2d')}
            className={`rounded-lg px-3 py-1.5 ${mode === '2d' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            2D план
          </button>
          <button
            type="button"
            onClick={() => onModeChange('3d')}
            className={`rounded-lg px-3 py-1.5 ${mode === '3d' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            3D визуализация
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          {mode === '2d' ? (
            <label className="flex items-center gap-2">Zoom
              <input type="range" min={0.6} max={1.8} step={0.05} value={zoom2d} onChange={(event) => setZoom2d(Number(event.target.value))} />
            </label>
          ) : (
            <>
              <label className="flex items-center gap-2">Zoom
                <input type="range" min={0.6} max={1.8} step={0.05} value={zoom3d} onChange={(event) => setZoom3d(Number(event.target.value))} />
              </label>
              <label className="flex items-center gap-2">Rotate
                <input type="range" min={0} max={360} step={1} value={rotation3d} onChange={(event) => setRotation3d(Number(event.target.value))} />
              </label>
            </>
          )}
          <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 hover:bg-slate-50" onClick={() => { setZoom2d(1); setZoom3d(1); setRotation3d(28); }}>Reset view</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {mode === '2d' ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="relative h-[520px] overflow-auto rounded-xl border border-slate-200 bg-white">
              <div
                ref={roomRef}
                className="relative m-4 origin-top-left border border-slate-400"
                style={{
                  width: roomPixelWidth,
                  height: roomPixelDepth,
                  transform: `scale(${zoom2d})`,
                  transformOrigin: 'top left',
                  backgroundImage: floorPlan.background_image_url
                    ? `linear-gradient(rgba(15,23,42,.35), rgba(15,23,42,.15)), url(${floorPlan.background_image_url})`
                    : 'linear-gradient(180deg, #f8fafc, #f1f5f9)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {floorPlan.grid_enabled ? (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage: `linear-gradient(to right, rgba(51,65,85,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(51,65,85,0.22) 1px, transparent 1px)`,
                      backgroundSize: `${panelPixelX}px ${panelPixelY}px`
                    }}
                  />
                ) : null}

                {racks.map((rack) => {
                  const rackLeft = rack.x * meterToPixel;
                  const rackTop = rack.z * meterToPixel;
                  const rackWidthPx = Math.max(rack.width * meterToPixel, 20);
                  const rackDepthPx = Math.max(rack.depth * meterToPixel, 20);
                  const isSelected = selectedRackId === rack.id;

                  return (
                    <button
                      key={rack.id}
                      type="button"
                      onPointerDown={(event) => {
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setDraggingRackId(rack.id);
                      }}
                      onPointerUp={(event) => {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                        setDraggingRackId(null);
                      }}
                      onPointerMove={(event) => handleDragMove(event, rack)}
                      onMouseEnter={() => setHoveredRackId(rack.id)}
                      onMouseLeave={() => setHoveredRackId((current) => (current === rack.id ? null : current))}
                      onClick={() => onSelectRack(rack)}
                      className={`absolute rounded-md border px-1 py-1 text-left text-[10px] font-semibold transition ${isSelected ? 'border-cyan-300 bg-cyan-100 text-cyan-900' : 'border-brand-300 bg-brand-100 text-brand-800 hover:bg-brand-200'}`}
                      style={{
                        left: rackLeft,
                        top: rackTop,
                        width: rackWidthPx,
                        height: rackDepthPx,
                        transform: `rotate(${rack.rotation_y}deg)`
                      }}
                    >
                      <span className="block truncate">{rack.name}</span>
                    </button>
                  );
                })}

                <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-slate-900/75 px-2 py-1 text-[10px] text-white">
                  {floorPlan.axis_x_label}: {floorPlan.width}м · {floorPlan.axis_y_label}: {floorPlan.depth}м
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-slate-950/95 p-3 text-white">
            <div className="relative h-[520px] overflow-hidden rounded-xl border border-white/10">
              <div
                className="absolute left-1/2 top-1/2"
                style={{
                  transform: `translate(-50%, -50%) scale(${zoom3d}) perspective(1200px) rotateX(58deg) rotateZ(${rotation3d}deg)`,
                  transformStyle: 'preserve-3d'
                }}
              >
                <div
                  className="relative border border-white/20 bg-slate-700/70"
                  style={{
                    width: roomPixelWidth,
                    height: roomPixelDepth,
                    boxShadow: '0 24px 80px rgba(15, 23, 42, 0.55)'
                  }}
                >
                  {racks.map((rack) => {
                    const isSelected = selectedRackId === rack.id;
                    const rackWidthPx = Math.max(rack.width * meterToPixel, 18);
                    const rackDepthPx = Math.max(rack.depth * meterToPixel, 14);
                    const rackHeightPx = Math.max(rack.height * meterToPixel * 0.45, 80);
                    const occupiedUnits = rack.equipment.length;
                    const occupancyRate = clamp(occupiedUnits / Math.max(rack.unit_capacity, 1), 0, 1);

                    return (
                      <button
                        key={rack.id}
                        type="button"
                        onClick={() => onSelectRack(rack)}
                        onMouseEnter={() => setHoveredRackId(rack.id)}
                        onMouseLeave={() => setHoveredRackId((current) => (current === rack.id ? null : current))}
                        className="absolute"
                        style={{
                          left: rack.x * meterToPixel,
                          top: rack.z * meterToPixel,
                          width: rackWidthPx,
                          height: rackDepthPx,
                          transformStyle: 'preserve-3d',
                          transform: `translateZ(${rackHeightPx / 2}px) rotate(${rack.rotation_y}deg)`
                        }}
                      >
                        <div className={`absolute inset-0 rounded-[4px] border ${isSelected ? 'border-cyan-300' : 'border-slate-400'} bg-slate-900/85`} />
                        <div className="absolute inset-0 rounded-[3px] border border-slate-500/70 bg-slate-900/70" style={{ transform: `translateZ(${rackHeightPx}px)` }} />
                        <div className="absolute left-0 top-0 h-full rounded-l-[3px] bg-slate-800/70" style={{ width: rackDepthPx, transform: `rotateY(90deg) translateZ(${-rackDepthPx / 2}px)` }} />
                        <div className="absolute right-0 top-0 h-full rounded-r-[3px] bg-slate-800/80" style={{ width: rackDepthPx, transform: `rotateY(-90deg) translateZ(${-rackDepthPx / 2}px)` }} />

                        <div className="absolute inset-[2px] rounded-[2px] border border-emerald-300/30 bg-slate-950/80" style={{ transform: `translateZ(${rackHeightPx - 3}px)` }}>
                          <div className="absolute inset-0">
                            {Array.from({ length: 14 }).map((_, idx) => (
                              <div
                                key={idx}
                                className="absolute left-0 right-0 border-t border-white/15"
                                style={{ top: `${(idx / 14) * 100}%` }}
                              />
                            ))}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-emerald-500/35" style={{ height: `${Math.round(occupancyRate * 100)}%` }} />
                        </div>
                        <span className="absolute left-1 top-1 text-[10px] font-semibold text-cyan-100" style={{ transform: `translateZ(${rackHeightPx + 2}px)` }}>
                          {rack.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
          {selectedRack ? (
            <>
              <h4 className="text-base font-semibold text-slate-900">Выбрана стойка {selectedRack.name}</h4>
              <div className="mt-2 space-y-1 text-slate-700">
                <p>Координаты: X={selectedRack.x.toFixed(2)}м, Y={selectedRack.z.toFixed(2)}м</p>
                <p>Размер: {selectedRack.width}×{selectedRack.depth}×{selectedRack.height} м</p>
                <p>U-слоты: {selectedRack.unit_capacity} / занято {selectedRack.equipment.length}</p>
              </div>
            </>
          ) : (
            <p className="text-slate-500">Выберите стойку на плане, чтобы увидеть детали.</p>
          )}

          {hoveredRack ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <p className="font-semibold text-slate-900">{hoveredRack.name}</p>
              <p className="text-xs text-slate-500">id: {hoveredRack.id} · SN: {hoveredRack.serial_number ?? 'n/a'}</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                <li>Энергия: {hoveredRack.energy_consumption ?? 0} W / {hoveredRack.energy_limit ?? 0} W</li>
                <li>Вес: {hoveredRack.weight ?? 0} kg</li>
                <li>Зона: {hoveredRack.zone_name ?? floorPlan.zone_name ?? 'n/a'}</li>
                <li>Оборудование: {hoveredRack.equipment_count ?? hoveredRack.equipment.length}</li>
                <li>Статус: {(hoveredRack.energy_limit && hoveredRack.energy_consumption && hoveredRack.energy_consumption > hoveredRack.energy_limit) ? 'warning' : 'active'}</li>
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
