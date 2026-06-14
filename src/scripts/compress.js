const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 원본 폴더와 압축 후 저장될 폴더 경로 설정
// (readme.md의 설계에 따라 raw 에셋은 public 밖인 프로젝트 루트의 asset-raw에 둡니다)
const INPUT_DIR = path.join(__dirname, '../../public/asset-raw');
const OUTPUT_DIR = path.join(__dirname, '../../public/asset-static');

console.log('📦 3D 모델 일괄 압축을 시작합니다...');

if (!fs.existsSync(INPUT_DIR)) {
  console.error(`❌ 원본 폴더를 찾을 수 없습니다: ${INPUT_DIR}`);
  process.exit(1);
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 폴더 내의 모든 .glb 및 .gltf 파일 찾기
const files = fs.readdirSync(INPUT_DIR).filter(file => file.endsWith('.glb') || file.endsWith('.gltf'));

if (files.length === 0) {
  console.log('🤷 압축할 3D 모델 파일이 없습니다.');
  process.exit(0);
}

files.forEach(file => {
  const inputFile = path.join(INPUT_DIR, file);
  const ext = path.extname(file); // 확장자 추출 (.glb)
  const basename = path.basename(file, ext); // 파일명 추출 (room-3m)
  const outputFile = path.join(OUTPUT_DIR, `${basename}-opt${ext}`); // room-3m-opt.glb

  console.log(`\n⏳ 변환 중: ${file} ...`);
  
  try {
    // @gltf-transform의 optimize 명령어로 자동 최적화 진행
    const command = `npx gltf-transform optimize "${inputFile}" "${outputFile}" --texture-compress webp --texture-size 1024`;
    execSync(command, { stdio: 'inherit' });
    
    const originalSize = fs.statSync(inputFile).size / (1024 * 1024);
    const newSize = fs.statSync(outputFile).size / (1024 * 1024);
    console.log(`✅ 압축 성공! 용량 변화: ${originalSize.toFixed(2)}MB -> ${newSize.toFixed(2)}MB`);
  } catch (error) {
    console.error(`❌ ${file} 압축 중 에러가 발생했습니다.`, error);
  }
});

console.log('\n🎉 모든 파일의 압축이 완료되었습니다!');