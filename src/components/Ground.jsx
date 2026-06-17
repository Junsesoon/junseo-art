import React, { useMemo } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export default function Ground({ position = [0, 0, 0], ...props }) {
  const { scene, nodes } = useGLTF('/asset-static/tile_basic-opt.glb');

  // 1. 모델에서 실제 Mesh를 찾고, 그 크기를 바탕으로 충돌체의 크기와 위치를 계산합니다.
  //    colliders="cuboid" 자동 계산은 GLB 파일의 원점(origin)이나 스케일(scale)에 따라
  //    예상과 다른 충돌체를 생성할 수 있어, 수동으로 계산하는 것이 가장 정확합니다.
  const { colliderArgs, colliderPosition } = useMemo(() => {
    const mesh = Object.values(nodes).find((node) => node.isMesh);
    if (!mesh) return { colliderArgs: [0.5, 0.05, 0.5], colliderPosition: [0, 0.05, 0] }; // 모델을 못찾을 경우 기본값

    // 모델의 바운딩 박스를 계산하여 실제 크기를 구합니다.
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);

    const center = new THREE.Vector3();
    box.getCenter(center);

    // Collider는 오브젝트의 '중심'을 기준으로 '절반' 크기(half-extents)를 인자로 받습니다.
    const colliderArgs = [size.x / 2, size.y / 2, size.z / 2];
    // Collider의 위치는 모델의 중심점(center)을 기준으로 조정합니다.
    const colliderPosition = [center.x, center.y, center.z];

    return { colliderArgs, colliderPosition };
  }, [nodes]);

  return (
    <group {...props}>
      {/* 기준이 되는 시각용 평면은 그대로 유지합니다. */}
      <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#cccccc" transparent opacity={0.2} />
      </mesh>

      {/* 전달받은 position 위치에 타일을 배치하고, 계산된 크기와 위치로 충돌체를 적용합니다. */}
      <RigidBody type="fixed" colliders={false} position={position}>
        <CuboidCollider args={colliderArgs} position={colliderPosition} />
        <primitive object={scene} />
      </RigidBody>
    </group>
  );
}

// 모델 로딩 최적화를 위한 프리로드
useGLTF.preload('/asset-static/tile_basic-opt.glb');