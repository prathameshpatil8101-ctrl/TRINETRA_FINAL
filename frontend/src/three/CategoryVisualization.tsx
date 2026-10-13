import { Canvas } from "@react-three/fiber"
import { Float, OrbitControls, Line } from "@react-three/drei"
import { useMemo } from "react"
import { useReducedMotion } from "motion/react"
import { SceneBoundary } from "./OceanWorld"
import * as THREE from "three"

function CategoryObject({ category }: { category: string }) {
  const name = category.toLowerCase()
  const material = (
    <meshStandardMaterial
      color="#61a8b5"
      roughness={0.42}
      metalness={0.75}
      emissive="#064e5b"
      emissiveIntensity={0.2}
    />
  )
  if (name.includes("pipeline")) {
    return (
      <group><mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.38, 0.38, 3, 18, 1, true]} />
        {material}
      </mesh>{[-1.2, 0, 1.2].map(position => <mesh key={position} position={[position, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[.4, .045, 8, 32]} />{material}</mesh>)}<mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.32, .32, 2.99, 18, 1, true]} /><meshStandardMaterial color="#102a35" side={THREE.BackSide} /></mesh></group>
    )
  }
  if (name.includes("mine") || name.includes("cylinder")) {
    return (
      <group>
        <mesh>
          <cylinderGeometry args={[0.55, 0.55, 1.8, 12]} />
          {material}
        </mesh>
        {[-0.75, 0.75].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.58, 0.05, 8, 24]} />
            {material}
          </mesh>
        ))}
        <mesh position={[0, .96, 0]}><cylinderGeometry args={[.19, .24, .14, 16]} />{material}</mesh>
        <mesh position={[0, 0, .55]}><boxGeometry args={[.09, 1.2, .04]} /><meshStandardMaterial color="#9abfc6" metalness={.8} roughness={.4} /></mesh>
      </group>
    )
  }
  if (name.includes("net")) {
    return (
      <OrganicNet />
    )
  }
  return (
    <group rotation={[0, -0.4, 0]}>
      <mesh position={[0, 0, 0]} rotation={[0, 0, -0.08]}>
        <boxGeometry args={[2.8, 0.45, 0.85]} />
        {material}
      </mesh>
      <mesh position={[-0.65, 0.45, 0]}>
        <boxGeometry args={[0.85, 0.55, 0.65]} />
        {material}
      </mesh>
      <mesh position={[1.15, -0.25, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.7, 0.12, 1.5]} />
        {material}
      </mesh>
      <mesh position={[1.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[.43, .7, 4]} />{material}</mesh>
      <mesh position={[-.65, .9, 0]}><boxGeometry args={[.45, .35, .5]} />{material}</mesh>
      <mesh position={[-.35, 1.1, 0]} rotation={[0, 0, -.15]}><cylinderGeometry args={[.035, .045, 1.1, 8]} />{material}</mesh>
      {[-.8, -.3, .2, .7].map(position => <mesh key={position} position={[position, .26, 0]}><boxGeometry args={[.045, .05, .92]} />{material}</mesh>)}
    </group>
  )
}

function OrganicNet() {
  const strands = useMemo(() => {
    const point = (horizontal: number, vertical: number): [number, number, number] => [horizontal, vertical - .1 * horizontal * horizontal, Math.sin(horizontal * 2 + vertical) * .22 + Math.cos(vertical * 2) * .13]
    return Array.from({ length: 18 }, (_, index) => Array.from({ length: 24 }, (_, segment) => {
      const fixed = ((index % 9) - 4) * .28
      const moving = (segment / 23 - .5) * 2.3
      return index < 9 ? point(fixed, moving) : point(moving, fixed)
    }))
  }, [])
  return <group rotation={[.2, .4, -.18]}>{strands.map((points, index) => <Line key={index} points={points} color="#78bcc3" lineWidth={1.1} transparent opacity={.75} />)}</group>
}

export default function CategoryVisualization({
  category,
}: {
  category: string
}) {
  const reducedMotion = useReducedMotion()
  return (
    <SceneBoundary><Canvas dpr={[1, 1.5]} camera={{ position: [0, 1, 4.5], fov: 42 }}>
      <ambientLight intensity={1.2} color="#67e8f9" />
      <directionalLight position={[3, 4, 5]} intensity={3} color="#60a5fa" />
      <pointLight position={[-3, -1, 2]} intensity={4} color="#14b8a6" />
      <Float speed={reducedMotion ? 0 : .7} rotationIntensity={0.1} floatIntensity={0.2}>
        <CategoryObject category={category} />
      </Float>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.35}
      />
    </Canvas></SceneBoundary>
  )
}
