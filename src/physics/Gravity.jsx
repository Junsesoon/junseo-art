import { useEffect, useState, useRef } from 'react';
import { useRapier } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';

/**
 * 전역 물리 엔진의 중력을 동적으로 제어하는 컴포넌트입니다.
 */
export default function Gravity() {
  const { world } = useRapier();
  // 중력 상태를 App.jsx가 아닌 여기서 독립적으로 관리합니다.
  const [gravity, setGravity] = useState([0, -9.81, 0]);
  
  const [sub] = useKeyboardControls();
  const lastJumpTime = useRef(0);

  // 스페이스바 더블 탭 감지 로직
  useEffect(() => {
    const unsub = sub(
      (state) => state.jump,
      (pressed) => {
        if (pressed) {
          const now = performance.now();
          // 300ms 이내에 스페이스바를 다시 누르면 무중력 토글
          if (now - lastJumpTime.current < 300) {
            setGravity((prev) => (prev[1] === 0 ? [0, -9.81, 0] : [0, 0, 0]));
          }
          lastJumpTime.current = now;
        }
      }
    );
    
    return () => unsub(); // 컴포넌트 언마운트 시 리스너 해제
  }, [sub]);

  useEffect(() => {
    if (world) {
      world.gravity = { x: gravity[0], y: gravity[1], z: gravity[2] };
    }
  }, [world, gravity]);

  return null; // 시각적 렌더링 요소가 없으므로 null 반환
}