const asar = require('asar');
const path = require('path');

// 定义 asar 文件路径和输出目录
const asarPath = path.join(__dirname, 'out/Snippai-darwin-arm64/Snippai.app/Contents/Resources/app.asar');
const extractPath = path.join(__dirname, 'extracted_app_via_script');

// 解包 asar 文件
console.log(`解包 ${asarPath} 到 ${extractPath}`);
asar.extractAll(asarPath, extractPath);
console.log('解包完成！'); 