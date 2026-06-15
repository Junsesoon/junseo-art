import React from 'react';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';

export default function Room(props) {
  const { scene } = useGLTF('/asset-static/room-opt.glb');

  return (
    // colliders={false}로 설정하여 자동 생성을 비활성화하고, 수동으로 콜라이더를 추가합니다.
    // Trimesh 콜라이더가 모델에 따라 불안정하게 생성될 수 있어, 바닥을 위한 별도의 CuboidCollider를 사용합니다.
    <RigidBody type="fixed" colliders={false} {...props}>
      <primitive object={scene} />
      {/* 바닥을 위한 보이지 않는 물리적 평면을 추가합니다. */}
      {/* args: [가로 절반, 높이 절반, 세로 절반] */}
      {/* position: RigidBody의 중심([0, -1, 0])을 기준으로 한 상대 위치 */}
      <CuboidCollider args={[20, 0.1, 20]} position={[0, 0, 0]} />
    </RigidBody>
  );
}

// 로딩 최적화를 위해 모델을 미리 불러옵니다.
// ⚠️ compress 스크립트 실행 후 생성되는 최적화된 모델 경로를 사용해야 합니다.
useGLTF.preload('/asset-static/room-opt.glb');