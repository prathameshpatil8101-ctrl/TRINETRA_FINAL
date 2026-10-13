import { Canvas, useFrame } from "@react-three/fiber"
import {
  Float,
  Line,
  OrbitControls,
  Points,
  PointMaterial,
} from "@react-three/drei"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import type { Detection } from "../types/trinetra"

const statusColor = (status: string) =>
  status === "ANOMALY_CANDIDATE"
    ? "#ef4444"
    : status === "REVIEW_REQUIRED"
      ? "#f59e0b"
      : "#22d3ee"

function Sweep() {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z -= delta * 0.32
  })
  return (
    <group ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[5.7, 64, 0, 0.48]} />
        <meshBasicMaterial
          color="#00e5ff"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <Line
        points={[
          [0, 0, 0.03],
          [5.7, 0, 0.03],
        ]}
        color="#67e8f9"
        transparent
        opacity={0.8}
        lineWidth={1}
      />
    </group>
  )
}

function SonarDisc() {
  const radial = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        return [
          new THREE.Vector3(0, 0.01, 0),
          new THREE.Vector3(Math.cos(a) * 5.7, 0.01, Math.sin(a) * 5.7),
        ]
      }),
    [],
  )
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5.8, 72]} />
        <meshBasicMaterial
          color="#062b3a"
          transparent
          opacity={0.28}
          side={THREE.DoubleSide}
        />
      </mesh>
      {[1.4, 2.8, 4.2, 5.7].map((radius) => (
        <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius - 0.012, radius + 0.012, 96]} />
          <meshBasicMaterial
            color="#0e7490"
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {radial.map((points, index) => (
        <Line
          key={index}
          points={points}
          color="#155e75"
          transparent
          opacity={0.4}
          lineWidth={0.5}
        />
      ))}
      <gridHelper
        args={[18, 18, "#0e7490", "#0b3548"]}
        position={[0, -1.5, 0]}
      />
    </group>
  )
}

function Particles({ reduced }: { reduced: boolean }) {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const count = reduced ? 220 : 520
    const values = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      values[i * 3] = (Math.random() - 0.5) * 18
      values[i * 3 + 1] = (Math.random() - 0.5) * 10
      values[i * 3 + 2] = (Math.random() - 0.5) * 16
    }
    return values
  }, [reduced])
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.008
      ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.15
    }
  })
  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled>
      <PointMaterial
        transparent
        color="#67e8f9"
        size={0.025}
        opacity={0.45}
        sizeAttenuation
        depthWrite={false}
      />
    </Points>
  )
}

function Marker({
  detection,
  index,
  selected,
  onSelect,
}: {
  detection: Detection
  index: number
  selected: boolean
  onSelect: () => void
}) {
  const angle = index * 2.399 + 0.7
  const radius = 1.4 + (index % 4) * 0.9
  const color = statusColor(detection.status)
  const scale = selected ? 1.35 : 1
  return (
    <Float speed={1.2} rotationIntensity={0} floatIntensity={0.3}>
      <group
        position={[
          Math.cos(angle) * radius,
          0.3 + (index % 2) * 0.3,
          Math.sin(angle) * radius,
        ]}
        scale={scale}
        onClick={(event) => {
          event.stopPropagation()
          onSelect()
        }}
      >
        <mesh>
          <sphereGeometry args={[0.11, 18, 18]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.24, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
        <pointLight color={color} intensity={2} distance={2.5} />
      </group>
    </Float>
  )
}

export default function SonarScene({
  detections,
  selectedId,
  onSelect,
  enabled = true,
}: {
  detections: Detection[]
  selectedId?: number
  onSelect: (id: number) => void
  enabled?: boolean
}) {
  return (
    <Canvas
      dpr={[1, enabled ? 1.5 : 1]}
      camera={{ position: [0, 6.3, 7.4], fov: 47 }}
      gl={{ antialias: true, alpha: true }}
    >
      <fog attach="fog" args={["#020b15", 7, 19]} />
      <ambientLight intensity={0.4} color="#0ea5b7" />
      <pointLight
        position={[0, 4, 2]}
        intensity={8}
        distance={18}
        color="#0369a1"
      />
      <Particles reduced={!enabled} />
      <SonarDisc />
      {enabled && <Sweep />}
      {detections.map((detection, index) => (
        <Marker
          key={detection.detection_id}
          detection={detection}
          index={index}
          selected={selectedId === detection.detection_id}
          onSelect={() => onSelect(detection.detection_id)}
        />
      ))}
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={0.65}
        maxPolarAngle={1.25}
        autoRotate={enabled}
        autoRotateSpeed={0.12}
      />
    </Canvas>
  )
}
