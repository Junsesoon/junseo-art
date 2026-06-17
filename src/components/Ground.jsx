import React from 'react';
import { RigidBody } from '@react-three/rapier';

export default function Ground(props) {
  return (
    // type="fixed"로 설정하여 중력의 영향을 받지 않는 고정된 바닥으로 만듭니다.
    <RigidBody type="fixed" {...props}>
      {/* Three.js에서는 Y축이 위아래를 나타내므로, 평면을 바닥으로 눕히기 위해 X축 기준으로 -90도(Math.PI / 2) 회전시킵니다. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>
    </RigidBody>
  );
}