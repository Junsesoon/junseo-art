import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export default function Ground({ position = [0, 0, 0], ...props }) {
  const { nodes, materials } = useGLTF('/asset-static/tile_basic-opt.glb');
  const { gl } = useThree();

  // 텍스처에 비등방성 필터링(Anisotropic Filtering)을 적용하여 무아레 현상과 텍스처 깨짐을 개선합니다.
  useLayoutEffect(() => {
    const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
    Object.values(materials).forEach((material) => {
      ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'].forEach((texName) => {
        if (material[texName]) {
          material[texName].anisotropy = maxAnisotropy;
          material[texName].needsUpdate = true;
        }
      });
      material.needsUpdate = true;
    });
  }, [materials, gl]);

  // 1. 모델에서 실제 Mesh를 찾고, 그 크기를 바탕으로 충돌체의 크기와 위치를 계산합니다.
  //    colliders="cuboid" 자동 계산은 GLB 파일의 원점(origin)이나 스케일(scale)에 따라
  //    예상과 다른 충돌체를 생성할 수 있어, 수동으로 계산하는 것이 가장 정확합니다.
  const { colliderArgs, colliderPosition, size, tileMesh } = useMemo(() => {
    const mesh = Object.values(nodes).find((node) => node.isMesh);
    if (!mesh) return { colliderArgs: [0.5, 0.05, 0.5], colliderPosition: [0, 0.05, 0], size: new THREE.Vector3(1, 0.1, 1), tileMesh: null };

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

    return { colliderArgs, colliderPosition, size, tileMesh: mesh };
  }, [nodes]);

  const gridSize = 10;
  const count = gridSize * gridSize; // 총 100개
  const meshRef = useRef();
  const colorA = useMemo(() => new THREE.Color('#ffffff'), []); // 밝은 색
  const colorB = useMemo(() => new THREE.Color('#cccccc'), []); // 어두운 색

  // 2. InstancedMesh에 100개의 타일 위치 데이터를 계산하여 적용합니다.
  useLayoutEffect(() => {
    if (!meshRef.current || !tileMesh) return;
    const dummy = new THREE.Object3D();

    const offsetX = (gridSize * size.x) / 2 - size.x / 2;
    const offsetZ = (gridSize * size.z) / 2 - size.z / 2;

    let i = 0;
    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        // 원본 모델의 origin 오프셋을 반영하여 위치를 설정합니다.
        dummy.position.set(
          tileMesh.position.x + x * size.x - offsetX,
          tileMesh.position.y,
          tileMesh.position.z + z * size.z - offsetZ
        );
        dummy.scale.copy(tileMesh.scale);
        dummy.rotation.copy(tileMesh.rotation);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);

        // 체스판 무늬를 위해 x, z 인덱스의 합이 짝수인지 홀수인지에 따라 다른 색상을 적용합니다.
        if ((x + z) % 2 === 0) {
          meshRef.current.setColorAt(i, colorA);
        } else {
          meshRef.current.setColorAt(i, colorB);
        }
        i++;
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    // 색상 버퍼가 변경되었음을 Three.js에 알려줍니다.
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [size, tileMesh, gridSize, count, colorA, colorB]);

  return (
    <group {...props}>
      {/* 기준이 되는 시각용 평면은 그대로 유지합니다. */}
      {/* Z-fighting 방지를 위해 기본 평면을 타일보다 아주 살짝(-0.01) 아래로 내립니다. */}
      <mesh position={[position[0], position[1] - 0.01, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#cccccc" transparent opacity={0.2} />
      </mesh>

      {/* 전달받은 position 위치에 10x10 타일 그리드와 전체를 덮는 충돌체를 배치합니다. */}
      <RigidBody type="fixed" colliders={false} position={position}>
        {/* 10x10 맵 전체를 덮는 거대한 단일 충돌체 */}
        <CuboidCollider 
          args={[(size.x * gridSize) / 2, colliderArgs[1], (size.z * gridSize) / 2]} 
          position={colliderPosition} 
        />
        
        {/* 성능 최적화를 위한 100개 타일 InstancedMesh */}
        {tileMesh && (
          <instancedMesh ref={meshRef} args={[tileMesh.geometry, tileMesh.material || Object.values(materials)[0], count]} castShadow receiveShadow />
        )}
      </RigidBody>
    </group>
  );
}

// 모델 로딩 최적화를 위한 프리로드
useGLTF.preload('/asset-static/tile_basic-opt.glb');