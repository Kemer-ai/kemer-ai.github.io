"use client";

import { useRef, useState, useMemo, Suspense, useEffect } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { FOOT_ZONES } from "@/lib/footZones";

// ── Error boundary ────────────────────────────────────────────────────────────
import { Component } from "react";
class GlbErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

// ── Foot silhouette shape (right foot, XZ plane) ─────────────────────────────
function buildFootShape() {
  const s = new THREE.Shape();
  s.moveTo(0.38, -0.72);
  s.quadraticCurveTo(0.44, -0.82, 0.06, -0.86);
  s.quadraticCurveTo(-0.22, -0.86, -0.28, -0.72);
  s.quadraticCurveTo(-0.40, -0.35, -0.32, 0.05);
  s.quadraticCurveTo(-0.44, 0.28, -0.46, 0.52);
  s.quadraticCurveTo(-0.48, 0.72, -0.42, 0.90);
  s.quadraticCurveTo(-0.36, 1.04, -0.26, 1.04);
  s.quadraticCurveTo(-0.18, 1.04, -0.16, 0.96);
  s.quadraticCurveTo(-0.13, 0.88, -0.08, 0.88);
  s.quadraticCurveTo(-0.06, 0.88, -0.04, 1.06);
  s.quadraticCurveTo(-0.02, 1.10, 0.04, 1.10);
  s.quadraticCurveTo(0.10, 1.10, 0.12, 1.03);
  s.quadraticCurveTo(0.14, 0.92, 0.19, 0.92);
  s.quadraticCurveTo(0.22, 0.92, 0.22, 1.05);
  s.quadraticCurveTo(0.23, 1.08, 0.28, 1.08);
  s.quadraticCurveTo(0.33, 1.08, 0.34, 0.99);
  s.quadraticCurveTo(0.35, 0.90, 0.39, 0.88);
  s.quadraticCurveTo(0.43, 0.88, 0.43, 0.98);
  s.quadraticCurveTo(0.44, 1.02, 0.48, 1.00);
  s.quadraticCurveTo(0.52, 0.98, 0.51, 0.88);
  s.quadraticCurveTo(0.52, 0.80, 0.54, 0.76);
  s.quadraticCurveTo(0.58, 0.72, 0.58, 0.82);
  s.quadraticCurveTo(0.59, 0.88, 0.62, 0.86);
  s.quadraticCurveTo(0.65, 0.83, 0.64, 0.72);
  s.quadraticCurveTo(0.62, 0.52, 0.56, 0.38);
  s.quadraticCurveTo(0.52, 0.20, 0.52, 0.05);
  s.quadraticCurveTo(0.50, -0.20, 0.46, -0.45);
  s.quadraticCurveTo(0.44, -0.60, 0.38, -0.72);
  return s;
}

// ── Procedural fallback mesh ──────────────────────────────────────────────────
function ProceduralFoot({ mirror }) {
  const shape = useMemo(() => buildFootShape(), []);
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.18, bevelEnabled: true,
      bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 6, steps: 2,
    });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [shape]);

  return (
    <mesh geometry={geo} scale={mirror ? [-1, 1, 1] : [1, 1, 1]} castShadow receiveShadow>
      <meshStandardMaterial color="#ffffff" roughness={0.78} metalness={0.0} />
    </mesh>
  );
}

// ── GLB foot loader ───────────────────────────────────────────────────────────
function GlbFoot({ path, mirror }) {
  const { scene } = useGLTF(path);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse(n => {
      if (n.isMesh) {
        n.material = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.78, metalness: 0.0 });
        n.castShadow = true;
      }
    });
    return c;
  }, [scene]);
  return <primitive object={cloned} scale={mirror ? [-1, 1, 1] : [1, 1, 1]} />;
}

// ── Semelle procédurale (fallback) ────────────────────────────────────────────
function ProceduralInsole({ mirror }) {
  const shape = useMemo(() => buildFootShape(), []);
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.04, bevelEnabled: true,
      bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, steps: 1,
    });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [shape]);
  return (
    <mesh geometry={geo} position={[0, -0.14, 0]} scale={mirror ? [-1.02, 1, 1.02] : [1.02, 1, 1.02]} receiveShadow>
      <meshStandardMaterial color="#4931F7" roughness={0.5} metalness={0.08} transparent opacity={0.85} />
    </mesh>
  );
}

// ── GLB semelle loader ────────────────────────────────────────────────────────
function GlbInsole({ path, mirror }) {
  const { scene } = useGLTF(path);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color("#4931F7"),
    roughness: 0.5, metalness: 0.08,
    transparent: true, opacity: 0.85,
    vertexColors: false,
  }), []);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse(n => {
      if (n.isMesh) {
        n.material = mat;
        n.material.needsUpdate = true;
        n.receiveShadow = true;
      }
    });
    return c;
  }, [scene, mat]);
  const s = mirror ? -0.93 : 0.93;
  return <primitive object={cloned} scale={[s, 0.93, 0.93]} position={[0, -0.12, 0]} />;
}

// ── 2D HTML hotspot ───────────────────────────────────────────────────────────
function Hotspot({ position, zone, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);
  const showLabel = hovered || isActive;

  return (
    <Html
      position={position}
      zIndexRange={[50, 100]}
      style={{ pointerEvents: "auto" }}
    >
      <div
        onClick={() => onClick(zone.label)}
        onMouseEnter={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
        onMouseLeave={() => { setHovered(false); document.body.style.cursor = "auto"; }}
        style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {/* Halo animé */}
        <div style={{
          position: "absolute",
          width: 28, height: 28,
          borderRadius: "50%",
          border: `2px solid ${zone.color}`,
          opacity: 0.4,
          animation: "pulse-ring 1.8s ease-out infinite",
        }} />
        {/* Cercle radio button */}
        <div style={{
          width: 16, height: 16,
          borderRadius: "50%",
          background: "#ffffff",
          border: `2.5px solid ${zone.color}`,
          boxShadow: `0 0 0 ${hovered || isActive ? 4 : 2}px ${zone.color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "box-shadow 0.15s",
        }}>
          <div style={{
            width: 7, height: 7,
            borderRadius: "50%",
            background: zone.color,
            opacity: isActive ? 1 : 0.85,
          }} />
        </div>

        {/* Tooltip */}
        {showLabel && (
          <div style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#ffffff",
            color: "#0f172a",
            padding: "4px 10px",
            borderRadius: 7,
            fontSize: 11,
            fontFamily: "system-ui,sans-serif",
            fontWeight: 700,
            whiteSpace: "nowrap",
            borderLeft: `3px solid ${zone.color}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.14)",
            pointerEvents: "none",
            zIndex: 200,
          }}>
            {zone.label}
            {zone.sublabel && (
              <div style={{ fontSize: 9, fontWeight: 400, color: "#64748b", marginTop: 1 }}>{zone.sublabel}</div>
            )}
          </div>
        )}
      </div>
    </Html>
  );
}

// ── Scene (deux pieds, hotspots sur le côté détecté) ─────────────────────────
function FootGroup({ glbPath, insolePath, mirror, showInsole, insoleOffset = [0, 0, 0] }) {
  return (
    <>
      <GlbErrorBoundary fallback={<ProceduralFoot mirror={mirror} />}>
        <Suspense fallback={<ProceduralFoot mirror={mirror} />}>
          <GlbFoot path={glbPath} mirror={false} />
        </Suspense>
      </GlbErrorBoundary>
      {showInsole && (
        <group position={insoleOffset}>
          <GlbErrorBoundary fallback={<ProceduralInsole mirror={mirror} />}>
            <Suspense fallback={<ProceduralInsole mirror={mirror} />}>
              <GlbInsole path={insolePath} mirror={mirror} />
            </Suspense>
          </GlbErrorBoundary>
        </group>
      )}
    </>
  );
}

function Scene({ side, detectedZoneIds, activeZone, onZoneClick }) {
  const showInsole = detectedZoneIds.includes("semelles");

  // Espacement entre les deux pieds (gauche à droite de l'écran, droit à gauche)
  const SEP = 0.9;
  const rightOffset = [-SEP, 0, 0];
  const leftOffset  = [SEP, 0, 0];

  // Hotspots sur le côté détecté (droit par défaut si inconnu)
  const onLeft   = side === "gauche";
  const baseOffset = onLeft ? leftOffset : rightOffset;
  const hotspotPos = (pos) => [
    (onLeft ? -pos[0] : pos[0]) + baseOffset[0],
    pos[1] + baseOffset[1],
    pos[2] + baseOffset[2],
  ];

  return (
    <>
      <ambientLight intensity={1.8} />
      <directionalLight position={[2, 5, 3]} intensity={1.8} castShadow shadow-mapSize={1024} />
      <directionalLight position={[-2, 3, -1]} intensity={0.6} color="#e0d9ff" />
      <directionalLight position={[0, -2, 2]} intensity={0.3} />

      {/* Pied droit */}
      <group position={rightOffset}>
        <FootGroup
          glbPath="/models/foot-droit.glb"
          insolePath="/models/semelle-droit.glb"
          mirror={false}
          showInsole={showInsole}
        />
      </group>

      {/* Pied gauche — insole = semelle-droit.glb mirrorée en X */}
      <group position={leftOffset}>
        <FootGroup
          glbPath="/models/foot-gauche.glb"
          insolePath="/models/semelle-droit.glb"
          mirror={true}
          showInsole={showInsole}
          insoleOffset={[-0.10, 0, 0]}
        />
      </group>

      {/* Hotspots sur le pied du côté détecté uniquement */}
      {detectedZoneIds.map(id => {
        const zone = FOOT_ZONES[id];
        if (!zone) return null;
        return (
          <Hotspot
            key={id}
            position={hotspotPos(zone.position)}
            zone={zone}
            isActive={activeZone === zone.label}
            onClick={onZoneClick}
          />
        );
      })}

      <OrbitControls enablePan={false} minDistance={3} maxDistance={7}
        minPolarAngle={Math.PI / 6} maxPolarAngle={Math.PI / 2.2} autoRotate={false} />
    </>
  );
}

// ── Keyframes ─────────────────────────────────────────────────────────────────
const PULSE_STYLE = `@keyframes pulse-ring { 0%{transform:scale(0.8);opacity:0.6} 100%{transform:scale(1.8);opacity:0} }`;

// ── Icônes inline ─────────────────────────────────────────────────────────────
const IconExpand = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);
const IconCollapse = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ── Viewer partagé (inline + fullscreen) ──────────────────────────────────────
function ViewerContent({ side, detectedZoneIds, detectedZones, activeZone, setActiveZone, sideLabel, fullscreen, onToggleFullscreen }) {
  const canvasHeight = fullscreen ? "100%" : "100%";
  const GRADIENT = "radial-gradient(ellipse 70% 55% at 50% 65%, #ddd6fe 0%, #ede9fe 30%, #f5f3ff 58%, #fafafe 80%, #ffffff 100%)";

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: "#ffffff",
      border: fullscreen ? "none" : "1px solid #e8e4ff",
      borderRadius: fullscreen ? 0 : 16,
      overflow: "visible",
      width: "100%", height: "100%",
    }}>
      <style>{PULSE_STYLE}</style>

      {/* Header */}
      <div style={{
        padding: "10px 12px 8px",
        borderBottom: "1px solid #ede9fe",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div>
          <p style={{ fontSize: 9, fontWeight: 900, color: "#4931F7", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}>
            Cartographie podologique
            {side && (
              <span style={{ background: "#4931F714", color: "#4931F7", padding: "2px 6px", borderRadius: 99, fontSize: 8, fontWeight: 900 }}>
                {sideLabel}
              </span>
            )}
          </p>
          <p style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, marginTop: 2 }}>
            {detectedZones.length > 0
              ? `${detectedZones.length} zone${detectedZones.length > 1 ? "s" : ""} identifiée${detectedZones.length > 1 ? "s" : ""}`
              : "Aucune zone identifiée"}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!fullscreen && <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 500 }}>Tournez · Cliquez</span>}
          <button
            onClick={onToggleFullscreen}
            title={fullscreen ? "Fermer" : "Plein écran"}
            style={{
              width: 26, height: 26, borderRadius: 7,
              background: fullscreen ? "#fee2e2" : "#4931F710",
              color: fullscreen ? "#ef4444" : "#4931F7",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
            }}
          >
            {fullscreen ? <IconCollapse /> : <IconExpand />}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{
        flex: 1,
        background: GRADIENT,
        position: "relative",
        overflow: "visible",
        minHeight: fullscreen ? 0 : undefined,
      }}>
        <Canvas
          camera={{ position: fullscreen ? [0, 3.0, 3.2] : [0, 3.4, 3.6], fov: fullscreen ? 46 : 52 }}
          shadows
          gl={{ antialias: true, alpha: true }}
          style={{ background: "transparent", width: "100%", height: "100%" }}
        >
          <Suspense fallback={null}>
            <Scene
              side={side}
              detectedZoneIds={detectedZoneIds}
              activeZone={activeZone}
              onZoneClick={label => setActiveZone(v => v === label ? null : label)}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Zone pills */}
      {detectedZones.length > 0 ? (
        <div style={{ padding: "8px 12px 10px", borderTop: "1px solid #4931F720", display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0 }}>
          {detectedZones.map(({ id, label, color }) => (
            <button key={id}
              onClick={() => setActiveZone(v => v === label ? null : label)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "2px 8px", borderRadius: 99,
                fontSize: 10, fontWeight: 700,
                background: `${color}22`, color,
                border: `1px solid ${color}40`,
                outline: activeZone === label ? `2px solid ${color}` : "none",
                cursor: "pointer",
              }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block" }} />
              {label}
            </button>
          ))}
        </div>
      ) : (
        <div style={{ padding: "8px 12px 10px", textAlign: "center", flexShrink: 0 }}>
          <p style={{ fontSize: 10, color: "#94a3b8", fontStyle: "italic" }}>Les zones s'activent à la génération du CR</p>
        </div>
      )}
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────
export default function FootViewer3D({ detectedZoneIds = [], side = null, compact = false }) {
  const [activeZone, setActiveZone] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e) => { if (e.key === "Escape") setIsFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  const detectedZones = detectedZoneIds.map(id => ({ id, ...FOOT_ZONES[id] })).filter(z => z.label);
  const sideLabel = side === "gauche" ? "Pied gauche" : side === "droit" ? "Pied droit" : "Pied";

  const sharedProps = { side, detectedZoneIds, detectedZones, activeZone, setActiveZone, sideLabel };

  return (
    <>
      {/* Vue inline */}
      <div style={{ width: "100%", height: compact ? 280 : 380, overflow: "visible" }}>
        <ViewerContent {...sharedProps} fullscreen={false} onToggleFullscreen={() => setIsFullscreen(true)} />
      </div>

      {/* Overlay plein écran */}
      {mounted && isFullscreen && createPortal(
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
          backdropFilter: "blur(4px)",
          animation: "fadeIn 0.18s ease",
        }}
          onClick={() => setIsFullscreen(false)}
        >
          <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
          <div
            style={{ width: "100%", maxWidth: 860, height: "80vh", borderRadius: 20, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.35)" }}
            onClick={e => e.stopPropagation()}
          >
            <ViewerContent {...sharedProps} fullscreen onToggleFullscreen={() => setIsFullscreen(false)} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
