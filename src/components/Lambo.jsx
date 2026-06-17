import React, { useRef } from 'react';
import { useGLTF } from '@react-three/drei';

export default function Lambo(props) {
  const group = useRef();
  const { scene } = useGLTF('/asset-static/lamborghini_revuelto-opt.glb');

  return (
    <group ref={group} {...props}>
      {/* 임시 조치: 모델이 왼쪽으로 90도 회전하도록 Y축 회전값을 조절 (Math.PI / 2) */}
      <primitive object={scene} rotation={[0, Math.PI / -2, 0]} />
    </group>
  );
}

// 로딩 최적화를 위한 프리로드
useGLTF.preload('/asset-static/lamborghini_revuelto-opt.glb');