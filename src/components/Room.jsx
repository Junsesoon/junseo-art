import React from 'react';
import { useGLTF } from '@react-three/drei';

export default function Room() {
  // public 폴더를 루트('/')로 인식하여 에셋을 비동기적으로 불러옵니다.
  const { scene } = useGLTF('/asset-static/room-opt.glb');
  
  return <primitive object={scene} />;
}

// 모델을 미리 캐싱해두어 렌더링 성능을 최적화합니다.
useGLTF.preload('/asset-static/room-opt.glb');