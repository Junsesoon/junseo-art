import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Move({ children, speed = 3, ...props }) {
  const group = useRef();
  // 키보드 눌림 상태를 추적할 참조(Ref) 객체입니다.
  const keys = useRef({ w: false, a: false, s: false, d: false });

  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (keys.current[key] !== undefined) keys.current[key] = true;
    };
    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (keys.current[key] !== undefined) keys.current[key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (!group.current) return;
    const currentSpeed = speed * delta; // 델타 타임을 곱해 프레임에 상관없이 일정한 속도 유지
    if (keys.current.w) group.current.position.z -= currentSpeed;
    if (keys.current.s) group.current.position.z += currentSpeed;
    if (keys.current.a) group.current.position.x -= currentSpeed;
    if (keys.current.d) group.current.position.x += currentSpeed;

    // 3인칭 백뷰 카메라 시점 구현
    const charPos = group.current.position;
    
    // 카메라가 위치할 목표 지점 (캐릭터의 위쪽으로 +2, 뒤쪽으로 +5 만큼 떨어진 곳)
    const idealCameraPos = new THREE.Vector3(charPos.x, charPos.y + 2, charPos.z + 5);
    
    // 카메라 위치를 목표 지점을 향해 부드럽게(0.1 속도로) 고무줄처럼 이동
    state.camera.position.lerp(idealCameraPos, 0.1);
    // 카메라의 렌즈가 항상 캐릭터의 살짝 위(y + 1)를 바라보도록 고정
    state.camera.lookAt(charPos.x, charPos.y + 1, charPos.z);
  });

  return (
    <group ref={group} {...props}>
      {children}
    </group>
  );
}