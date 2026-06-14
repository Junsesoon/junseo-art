import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

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
  });

  return (
    <group ref={group} {...props}>
      {children}
    </group>
  );
}