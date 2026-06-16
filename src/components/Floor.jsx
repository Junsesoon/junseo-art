import React from 'react';
import { useGLTF, Clone } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';

export default function Floor({ type = 1, ...props }) {
  // type 속성에 따라 로드할 타일 파일의 경로를 동적으로 결정합니다.
  // 💡 만약 npm run compress를 통해 압축했다면 경로를 `/asset-static/tile${type}-opt.glb` 로 변경해주세요!
  const { scene } = useGLTF(`/asset-static/tile${type}-opt.glb`);

  return (
    // 타일 위에 캐릭터가 설 수 있도록 type="fixed"와 trimesh(또는 cuboid)를 적용합니다.
    <RigidBody type="fixed" colliders="trimesh" {...props}>
      {/* 
        같은 타일을 맵 여러 곳에 반복 배치할 수 있도록 
        <primitive> 대신 <Clone>을 사용하여 모델을 안전하게 복제합니다.
      */}
      <Clone object={scene} />
    </RigidBody>
  );
}

// 초기 렌더링 속도를 위해 1번 타일을 미리 캐싱(Preload) 해둡니다.
// (타일이 늘어나면 아래에 추가해 주시면 좋습니다)
useGLTF.preload('/asset-static/tile1-opt.glb');