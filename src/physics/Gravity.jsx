import { useEffect } from 'react';
import { useRapier } from '@react-three/rapier';

/** ==============================
 * 1. 기본 중력(지구)을 적용하는 서브 컴포넌트입니다.
 * ============================== */
function DefaultGravity() {
  const { world } = useRapier();
  useEffect(() => {
    world.gravity = { x: 0, y: -9.81, z: 0 };
  }, [world]);
  return null;
}

/** ==============================
 * 2. 무중력 상태를 적용하는 서브 컴포넌트입니다.
 * ============================== */
function NoneGravity() {
  const { world } = useRapier();
  useEffect(() => {
    world.gravity = { x: 0, y: 0, z: 0 };
  }, [world]);
  return null;
}

/** ==============================
 * 3. 2배의 중력을 적용하는 서브 컴포넌트입니다.
 * ============================== */
function DoubleGravity() {
  const { world } = useRapier();
  useEffect(() => {
    world.gravity = { x: 0, y: -19.62, z: 0 };
  }, [world]);
  return null;
}

/** ==============================
 * 4. 달 중력(지구의 1/6)을 적용하는 서브 컴포넌트입니다.
 * ============================== */
function MoonGravity() {
  const { world } = useRapier();
  useEffect(() => {
    world.gravity = { x: 0, y: -1.635, z: 0 };
  }, [world]);
  return null;
}

/** ==============================
 * 전역 물리 엔진의 중력을 동적으로 제어하는 '라우터' 컴포넌트입니다.
 * App에서 전달받은 mode에 따라 적절한 중력 서브 컴포넌트를 렌더링합니다.
 * ============================== */
export default function Gravity({ mode = 'default' }) {
  switch (mode) {
    case 'none':
      return <NoneGravity />;
    case 'moon':
      return <MoonGravity />;
    case 'double':
      return <DoubleGravity />;
    case 'default':
    default:
      return <DefaultGravity />;
  }
}