import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import Room from './components/Room';

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#f0f0f0' }}>
      <Canvas camera={{ position: [-5, 2, 5], fov: 60 }}>
        {/* 카메라 옵션(겁나 헷갈림 ㅡㅡ)x:좌우, y:상하(높이), z:앞뒤(값이 커질수록 멀어짐) */}
        {/* 전체적인 밝기를 담당하는 기본 조명 */}
        <ambientLight intensity={1.5} />
        {/* 입체감과 그림자를 만들어주는 방향성 조명 */}
        <directionalLight position={[1, 10, 5]} intensity={2} />
                
        {/* Room 컴포넌트가 로드될 때까지 빈 화면을 보여줍니다 (필요 시 로딩 스피너로 교체 가능) */}
        <Suspense fallback={null}>
          <Room />
        </Suspense>
        
        {/* 마우스 드래그로 방을 360도로 돌려볼 수 있게 해주는 유용한 컨트롤러 */}
        <OrbitControls makeDefault />
        
        {/* 우측 하단에 미니맵/나침반 역할의 Gizmo 추가 */}
        <GizmoHelper
          alignment="top-right" // 화면 우측 상단에 배치
          margin={[80, 80]} // 화면 가장자리로부터의 여백 (x, y)
        >
          <GizmoViewport axisColors={['red', 'green', 'blue']} labelColor="white" />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}