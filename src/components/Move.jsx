import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function Move({ children, speed = 3, ...props }) {
  const group = useRef();
  // 키보드 눌림 상태를 추적할 참조(Ref) 객체입니다.
  const keys = useRef({ w: false, a: false, s: false, d: false });
  // 마우스 회전(시점) 상태를 저장할 참조 객체입니다 (좌우: yaw, 상하: pitch).
  const rotation = useRef({ yaw: 0, pitch: 0 });
  // 캔버스 요소를 가져와 포인터 락(마우스 숨김 및 잠금)을 적용하기 위해 사용합니다.
  const { gl } = useThree();

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

    // 화면을 클릭하면 마우스 커서를 숨기고 화면 가운데에 고정(Pointer Lock)합니다.
    const handleCanvasClick = () => {
      gl.domElement.requestPointerLock();
    };

    // 마우스가 숨겨진 상태일 때 마우스 이동량을 감지해 카메라 시점(각도)을 업데이트합니다.
    const handleMouseMove = (e) => {
      if (document.pointerLockElement === gl.domElement) {
        rotation.current.yaw -= e.movementX * 0.002; // 좌우 마우스 감도
        rotation.current.pitch += e.movementY * 0.002; // 상하 마우스 감도 (정상화)
        // 카메라가 너무 답답하지 않도록 수평선 아래 25도(-25도)까지만 허용합니다.
        const minPitch = -15 * (Math.PI / 180);
        rotation.current.pitch = Math.max(minPitch, Math.min(Math.PI / 2 - 0.1, rotation.current.pitch));
      }
    };

    gl.domElement.addEventListener('click', handleCanvasClick);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      gl.domElement.removeEventListener('click', handleCanvasClick);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gl]);

  useFrame((state, delta) => {
    if (!group.current) return;
    const currentSpeed = speed * delta; // 델타 타임을 곱해 프레임에 상관없이 일정한 속도 유지

    // 1. 키 입력이 있을 때만 이동 및 회전 연산
    if (keys.current.w || keys.current.s || keys.current.a || keys.current.d) {
      // 카메라가 바라보는 정면(forward)과 좌우(right) 방향을 계산
      const forward = new THREE.Vector3();
      state.camera.getWorldDirection(forward);
      forward.y = 0; // 평면 이동을 위해 높이 무시
      forward.normalize();

      const right = new THREE.Vector3().crossVectors(state.camera.up, forward).normalize();

      const moveVector = new THREE.Vector3();
      if (keys.current.w) moveVector.add(forward);
      if (keys.current.s) moveVector.sub(forward);
      if (keys.current.a) moveVector.add(right);
      if (keys.current.d) moveVector.sub(right);

      moveVector.normalize();

      // 2. 캐릭터 위치 이동
      group.current.position.addScaledVector(moveVector, currentSpeed);

      // 3. 캐릭터 몸통 회전 고정 (방향키 입력에 상관없이 항상 카메라 정면을 바라보게 함)
      group.current.rotation.y = Math.atan2(forward.x, forward.z) + Math.PI;
    }

    // 4. 포인터 락 기반의 3인칭 카메라 이동 (구면 좌표계 활용)
    const distance = 5; // 카메라와 캐릭터 사이의 기본 거리

    // 회전 각도(yaw, pitch)를 직교 좌표계(X, Y, Z) 오프셋으로 변환
    const offsetX = distance * Math.cos(rotation.current.pitch) * Math.sin(rotation.current.yaw);
    const offsetY = distance * Math.sin(rotation.current.pitch);
    const offsetZ = distance * Math.cos(rotation.current.pitch) * Math.cos(rotation.current.yaw);

    const idealCameraPos = new THREE.Vector3(
      group.current.position.x + offsetX,
      group.current.position.y + 2 + offsetY, // 캐릭터 상단(2) 기준으로 높이 조절
      group.current.position.z + offsetZ
    );

    // 목표 위치를 향해 카메라를 부드럽게 이동 (카메라가 빠르게 따라오도록 0.2로 설정)
    state.camera.position.lerp(idealCameraPos, 0.2);
    
    // 카메라는 항상 캐릭터의 상체(y + 1)를 바라보도록 고정
    state.camera.lookAt(group.current.position.x, group.current.position.y + 1, group.current.position.z);
  });

  return (
    <group ref={group} {...props}>
      {children}
    </group>
  );
}