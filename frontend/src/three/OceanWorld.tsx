import { Canvas, useFrame } from "@react-three/fiber"
import { Points, PointMaterial, Line } from "@react-three/drei"
import { Component, type ReactNode, useMemo, useRef, useState, useEffect } from "react"
import { useReducedMotion } from "motion/react"
import * as THREE from "three"
import type { Detection } from "../types/trinetra"

interface WorldProps {
  progress?: React.RefObject<number>
  detections?: Detection[]
  selectedId?: number
  onSelect?: (id: number) => void
  enabled?: boolean
}

function Environment({ progress, detections = [], selectedId, onSelect, enabled = true }: WorldProps) {
  const dust = useRef<THREE.Points>(null)
  const waves = useRef<THREE.Group>(null)
  const beam = useRef<THREE.Group>(null)
  const pointer = useRef(new THREE.Vector2())
  useEffect(() => {
    if (!enabled) return
    const move = (event: PointerEvent) => pointer.current.set(event.clientX / window.innerWidth * 2 - 1, -(event.clientY / window.innerHeight * 2 - 1))
    window.addEventListener("pointermove", move, { passive: true })
    return () => window.removeEventListener("pointermove", move)
  }, [enabled])
  const cameraTarget = useRef(new THREE.Vector3(1.5, -1.6, -4))
  const cameraPosition = useMemo(() => new THREE.Vector3(), [])
  const focus = useMemo(() => new THREE.Vector3(), [])
  const cameraStops = useMemo(() => [[10, 5, 17], [7, 3.7, 12], [5, 1.5, 7], [8, 4, 11], [6, 3, 10], [5, 4, 12], [11, 7, 20]].map(position => new THREE.Vector3(...position as [number, number, number])), [])
  const [compact] = useState(() => window.innerWidth < 1000)
  const terrain = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(65, 65, compact ? 48 : 72, compact ? 48 : 72)
    const positions = geometry.attributes.position
    for (let index = 0; index < positions.count; index++) {
      const horizontal = positions.getX(index)
      const vertical = positions.getY(index)
      const height = Math.sin(horizontal * .24) * Math.cos(vertical * .19) * 2.1 + Math.sin(horizontal * .65 + vertical * .38) * .45
      positions.setZ(index, height)
    }
    geometry.computeVertexNormals()
    return geometry
  }, [compact])
  useEffect(() => () => terrain.dispose(), [terrain])
  const particles = useMemo(() => {
    const positions = new Float32Array(compact ? 900 : 1800)
    for (let index = 0; index < positions.length; index++) positions[index] = (Math.random() - .5) * 42
    return positions
  }, [compact])
  useFrame((state, delta) => {
    const time = enabled ? state.clock.elapsedTime : 0
    const depth = THREE.MathUtils.clamp(progress?.current || 0, 0, 1)
    const stage = Math.min(6, depth * 6)
    const stop = Math.min(5, Math.floor(stage))
    const fraction = THREE.MathUtils.smoothstep(stage - stop, 0, 1)
    cameraPosition.copy(cameraStops[stop]).lerp(cameraStops[stop + 1], fraction)
    const selectedIndex = detections.findIndex(item => item.detection_id === selectedId)
    focus.set(2, -1.5, -2)
    if (selectedIndex >= 0) {
      focus.set(Math.cos(selectedIndex * 2.4) * 4, -1, Math.sin(selectedIndex * 2.4) * 4)
      cameraPosition.set(focus.x + 6, 3.5, focus.z + 9)
    }
    if (enabled) {
      cameraPosition.x += pointer.current.x * .55 + Math.sin(time * .09) * .2
      cameraPosition.y += pointer.current.y * .25
    }
    const easing = 1 - Math.exp(-Math.min(delta, .05) * 2)
    state.camera.position.lerp(cameraPosition, easing)
    cameraTarget.current.lerp(focus, easing)
    state.camera.lookAt(cameraTarget.current)
    if (dust.current) dust.current.rotation.y = time * .009
    if (beam.current) beam.current.rotation.y = time * .14
    waves.current?.children.forEach((wave, index) => {
      const phase = ((time * .13 + index / 5) % 1)
      wave.scale.setScalar(1 + phase * 9)
      const material = (wave as THREE.Mesh).material as THREE.MeshBasicMaterial
      const scanStrength = progress ? .45 + Math.sin(Math.min(stage, 3) / 3 * Math.PI) * .55 : 1
      material.opacity = (1 - phase) * .28 * scanStrength
    })
  })
  return <>
    <fogExp2 attach="fog" args={["#04121e", .034]} />
    <ambientLight intensity={.55} color="#278aa2" />
    <directionalLight position={[3, 12, 4]} intensity={2.8} color="#89e8ed" />
    <pointLight position={[-8, 2, -8]} intensity={40} color="#4668d6" distance={24} />
    <Points ref={dust} positions={particles} stride={3} frustumCulled={false}>
      <PointMaterial color="#9be2ef" size={.035} transparent opacity={.48} depthWrite={false} />
    </Points>
    <mesh geometry={terrain} rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, -8]}>
      <meshStandardMaterial color="#063142" roughness={.85} metalness={.35} />
    </mesh>
    <mesh geometry={terrain} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.98, -8]}>
      <meshBasicMaterial color="#248d9d" wireframe transparent opacity={.095} />
    </mesh>
    <group position={[3, -1.5, -2]} rotation={[.1, -.35, .12]}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[.55, .7, 7, 12]} />
        <meshStandardMaterial color="#277484" metalness={.8} roughness={.36} />
      </mesh>
      {[-2.6, 0, 2.6].map(position => <mesh key={position} position={[position, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[.66, .075, 8, 32]} /><meshStandardMaterial color="#62b9c3" metalness={.7} roughness={.3} />
      </mesh>)}
      <Line points={[[-3.5, .6, 0], [3.5, .6, 0]]} color="#66e7ee" transparent opacity={.65} />
    </group>
    <group ref={waves} position={[3, -2.5, -2]}>
      {[0, 1, 2, 3, 4].map(index => <mesh key={index} rotation={[-Math.PI / 2 + .12, 0, 0]}>
        <ringGeometry args={[.98, 1, 100]} /><meshBasicMaterial color="#48e8de" transparent opacity={.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>)}
    </group>
    <group ref={beam} position={[3, -2.4, -2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[17, 64, 0, .28]} /><meshBasicMaterial color="#22d3ee" transparent opacity={.065} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
    {[-9, -3, 5].map((position, index) => <mesh key={position} position={[position, 5, -9 - index * 3]} rotation={[0, 0, -.22]}>
      <coneGeometry args={[3, 24, 24, 1, true]} /><meshBasicMaterial color="#48acb9" transparent opacity={.025} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>)}
    {detections.map((detection, index) => <DetectionMarker key={detection.detection_id} detection={detection} index={index} selected={selectedId === detection.detection_id} onSelect={onSelect} enabled={enabled} />)}
  </>
}

function DetectionMarker({ detection, index, selected, onSelect, enabled }: { detection: Detection; index: number; selected: boolean; onSelect?: (id: number) => void; enabled: boolean }) {
  const pulse = useRef<THREE.Mesh>(null)
  const marker = useRef<THREE.Group>(null)
  const color = detection.status === "ANOMALY_CANDIDATE" ? "#ef4444" : detection.status === "REVIEW_REQUIRED" ? "#f59e0b" : "#64d8b4"
  useFrame((state, delta) => {
    const phase = enabled ? (state.clock.elapsedTime * .24 + index * .17) % 1 : .35
    if (pulse.current) {
      pulse.current.scale.setScalar(1 + phase * 2.2)
      const material = pulse.current.material as THREE.MeshBasicMaterial
      material.opacity = (1 - phase) * (selected ? .5 : .22)
    }
    if (marker.current) marker.current.scale.setScalar(THREE.MathUtils.lerp(marker.current.scale.x, selected ? 1.4 : 1, 1 - Math.exp(-delta * 4)))
  })
  return <group ref={marker} position={[Math.cos(index * 2.4) * 4, -1, Math.sin(index * 2.4) * 4]} onClick={event => { event.stopPropagation(); onSelect?.(detection.detection_id) }}>
    <mesh><icosahedronGeometry args={[.2, 1]} /><meshBasicMaterial color={color} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[.5, .012, 6, 48]} /><meshBasicMaterial color={color} transparent opacity={.8} /></mesh>
    <mesh ref={pulse} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.48, .51, 48]} /><meshBasicMaterial color={color} transparent opacity={.3} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <Line points={[[0, -.1, 0], [0, -2.4, 0]]} color={color} transparent opacity={.22} />
  </group>
}

export class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <div className="ocean-fallback" role="img" aria-label="3D visualization unavailable. Analysis and evidence remain available." /> : this.props.children
  }
}

export default function OceanWorld(props: WorldProps) {
  const reducedMotion = useReducedMotion()
  const [available] = useState(() => {
    try { return !!document.createElement("canvas").getContext("webgl2") } catch { return false }
  })
  const [compact] = useState(() => window.innerWidth < 768)
  if (!available) return <div className="ocean-fallback" aria-label="Underwater atmosphere; 3D unavailable on this device" />
  return <SceneBoundary><Canvas dpr={[1, compact ? 1 : 1.5]} camera={{ position: [9, 5, 15], fov: 46 }} gl={{ antialias: !compact, alpha: true }}><Environment {...props} enabled={props.enabled !== false && !reducedMotion} /></Canvas></SceneBoundary>
}
