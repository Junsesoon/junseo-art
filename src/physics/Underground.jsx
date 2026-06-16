import React from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';

export default function Underground({ position = [0, -10, 0] }) {
  return (
    // type="fixed"로 설정하여 중력의 영향을 받지 않는 고정 객체로 만듭니다.
    <RigidBody type="fixed" position={position} name="underground">
      {/* 
        sensor={true}: 물리적으로 부딪혀서 통통 튀지 않고 겹침(통과)만 감지하는 센서 모드로 작동합니다.
        args={[500, 0.5, 500]}: 맵 밖으로 떨어지는 모든 것을 감지할 수 있도록 매우 넓게(1000x1000) 깝니다.
      */}
      <CuboidCollider
        args={[500, 0.5, 500]}
        sensor={true}
        onIntersectionEnter={(e) => {
          // 센서에 닿은 물체(캐릭터, 아이템 등)의 물리 속성을 직접 제어하여 위치와 속도를 초기화합니다.
          if (e.other.rigidBody) {
            e.other.rigidBody.setTranslation({ x: 0, y: 3, z: 0 }, true);
            e.other.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
          }
        }}
      />
    </RigidBody>
  );
}