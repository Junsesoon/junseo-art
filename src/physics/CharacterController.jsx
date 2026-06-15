import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useRapier, RigidBody, CapsuleCollider } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';

// 키보드 액션에 대한 열거형(enum)을 정의합니다.
export const Controls = {
  forward: 'forward',
  back: 'back',
  left: 'left',
  right: 'right',
  jump: 'jump',
};

export default function CharacterController({ children, speed = 4, jumpHeight = 0.8, ...props }) {
  const body = useRef();
  const character = useRef(); // 캐릭터 모델을 감싸는 group의 ref
  const { rapier, world } = useRapier();
  const [sub, get] = useKeyboardControls();
  const { camera, gl } = useThree();

  // 콜라이더의 크기와 모델의 위치를 동적으로 설정하기 위한 상태
  const [colliderProps, setColliderProps] = useState({
    args: [0.4, 0.4], // 초기값: [반높이, 반지름]
    offset: -0.8, // 초기값: -(반높이 + 반지름)
  });

  // 캐릭터 모델의 크기를 측정하여 콜라이더를 자동으로 맞추는 로직
  useLayoutEffect(() => {
    if (character.current) {
      // 모델이 로드될 때까지 기다립니다.
      const model = character.current.children[0];
      if (model) {
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const height = size.y;
        const radius = (size.x + size.z) / 4; // 너비와 깊이의 평균으로 반지름 추정
        const halfHeight = Math.max(0, height / 2 - radius);

        setColliderProps({ args: [halfHeight, radius], offset: -(halfHeight + radius) });
      }
    }
  }, [children]); // 자식 모델이 변경될 때마다 재계산

  // 마우스 회전(시점) 상태를 저장할 참조 객체입니다.
  const rotation = useRef({ yaw: Math.PI, pitch: 0 }); // 초기 yaw를 PI로 설정하여 캐릭터의 뒷모습에서 시작

  // 마우스 컨트롤 및 포인터 락 설정
  useEffect(() => {
    const handleCanvasClick = () => gl.domElement.requestPointerLock();
    const handleMouseMove = (e) => {
      if (document.pointerLockElement === gl.domElement) {
        rotation.current.yaw -= e.movementX * 0.002;
        rotation.current.pitch += e.movementY * 0.002;
        // 상하 시야각 제한
        const minPitch = -15 * (Math.PI / 180); // 지평선 아래 -15도
        rotation.current.pitch = Math.max(minPitch, Math.min(Math.PI / 2 - 0.2, rotation.current.pitch));
      }
    };
    gl.domElement.addEventListener('click', handleCanvasClick);
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      gl.domElement.removeEventListener('click', handleCanvasClick);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gl]);

  useFrame((state, delta) => {
    if (!body.current || !character.current) return;

    // --- 추가: 낙하 시 위치 리셋 로직 ---
    const bodyPosition = body.current.translation();
    if (bodyPosition.y < -10) { // 특정 높이(-10) 이하로 떨어졌을 때
      body.current.setTranslation({ x: 0, y: 3, z: 0 }, true); // 초기 위치로 리셋
      body.current.setLinvel({ x: 0, y: 0, z: 0 }, true); // 이동 속도 초기화
      return; // 리셋 후 해당 프레임의 나머지 로직은 실행하지 않음
    }

    // --- 1. 키 입력 및 방향 계산 ---
    const { forward, back, left, right, jump } = get();
    const velocity = body.current.linvel();

    // 카메라의 y축 회전(yaw)을 기준으로 방향 벡터를 계산합니다.
    const cameraYaw = new THREE.Euler(0, rotation.current.yaw, 0, 'YXZ');
    const moveDirection = new THREE.Vector3((left ? 1 : 0) - (right ? 1 : 0), 0, (forward ? 1 : 0) - (back ? 1 : 0))
      .normalize()
      .applyEuler(cameraYaw);

    // --- 2. 이동 및 속도 적용 ---
    const newVel = new THREE.Vector3(moveDirection.x * speed, velocity.y, moveDirection.z * speed);
    body.current.setLinvel(newVel, true);

    // --- 3. 접지 확인 (Raycasting) ---
    const [halfHeight, radius] = colliderProps.args;
    // 리지드바디의 중심에서 캡슐 콜라이더의 가장 아래쪽까지의 거리
    const capsuleBottomDistance = halfHeight + radius;
    const ray = new rapier.Ray(bodyPosition, { x: 0, y: -1, z: 0 });
    // 레이의 길이는 캡슐 바닥까지의 거리보다 약간 길게 설정
    const rayLength = capsuleBottomDistance + 0.1;
    const hit = world.castRay(ray, rayLength, true, undefined, undefined, body.current);
    // 충돌 지점(toi)이 캡슐 바닥까지의 거리 + 약간의 오차 내에 있다면 접지 상태로 판단
    const isGrounded = hit && hit.toi < capsuleBottomDistance + 0.05;

    // --- 4. 점프 로직 ---
    if (jump && isGrounded) {
      body.current.setLinvel({ x: velocity.x, y: speed * jumpHeight, z: velocity.z }, true);
    }

    // --- 5. 캐릭터 모델 회전 (FPS 스타일) ---
    // 캐릭터의 Y축 회전을 카메라의 Y축 회전(yaw)과 일치시켜, 항상 마우스 방향을 바라보게 합니다.
    // Judy 모델 자체에 적용된 보정 회전값(PI)을 상쇄하기 위해 PI를 빼줍니다.
    character.current.rotation.y = rotation.current.yaw - Math.PI;

    // --- 6. 3인칭 카메라 위치 업데이트 (구면 좌표계) ---
    const distance = 5;

    const offsetX = distance * Math.sin(rotation.current.yaw) * Math.cos(rotation.current.pitch);
    const offsetY = distance * Math.sin(rotation.current.pitch);
    const offsetZ = distance * Math.cos(rotation.current.yaw) * Math.cos(rotation.current.pitch);

    const idealCameraPos = new THREE.Vector3(bodyPosition.x - offsetX, bodyPosition.y + 1.5 + offsetY, bodyPosition.z - offsetZ);

    state.camera.position.lerp(idealCameraPos, delta * 10);
    const idealLookAt = new THREE.Vector3(bodyPosition.x, bodyPosition.y + 1, bodyPosition.z);
    state.camera.lookAt(idealLookAt);
  });

  return (
    <RigidBody
      ref={body}
      colliders={false}
      mass={1}
      type="dynamic"
      position={[0, 3, 0]}
      enabledRotations={[false, false, false]}
      {...props}
    >
      <CapsuleCollider args={colliderProps.args} />
      <group ref={character} position={[0, colliderProps.offset, 0]}>
        {children}
      </group>
    </RigidBody>
  );
}