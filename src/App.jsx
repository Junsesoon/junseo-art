import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport, KeyboardControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import Room from './components/Room';
import Judy from './components/Judy';
import CharacterController, { Controls } from './physics/CharacterController';

export default function App() {
  // 키보드 컨트롤을 위한 맵을 정의합니다.
  const map = useMemo(() => [
    { name: Controls.forward, keys: ['ArrowUp', 'KeyW'] },
    { name: Controls.back, keys: ['ArrowDown', 'KeyS'] },
    { name: Controls.left, keys: ['ArrowLeft', 'KeyA'] },
    { name: Controls.right, keys: ['ArrowRight', 'KeyD'] },
    { name: Controls.jump, keys: ['Space'] },
  ], []);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#f0f0f0' }}>
      {/* KeyboardControls로 Canvas를 감싸고, 위에서 정의한 key map을 전달합니다. */}
      <KeyboardControls map={map}>
        <Canvas shadows camera={{ fov: 60 }}>
          {/* 전체적인 밝기를 담당하는 기본 조명 */}
          <ambientLight intensity={1.5} />
          {/* 입체감과 그림자를 만들어주는 방향성 조명 */}
          <directionalLight position={[1, 10, 5]} intensity={2} castShadow />

          {/* Suspense는 내부 컴포넌트(모델 등)가 로드될 때까지 fallback을 보여줍니다. */}
          <Suspense fallback={null}>
            {/* Physics 컴포넌트로 감싸진 영역 안에서 물리 엔진이 활성화됩니다. */}
            <Physics debug> {/* debug 속성 추가 시 콜라이더가 시각적으로 표시됩니다. */}
              <Room position={[0, -1, 0]} />
              <CharacterController>
                <Judy scale={0.8} />
              </CharacterController>
            </Physics>
          </Suspense>

          <GizmoHelper alignment="top-right" margin={[80, 80]}>
            <GizmoViewport axisColors={['red', 'green', 'blue']} labelColor="white" />
          </GizmoHelper>
        </Canvas>
      </KeyboardControls>
    </div>
  );
}