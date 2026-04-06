import XLSX from './server/node_modules/xlsx/+esm';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const questions = [
  ['题目', '类型', '选项', '答案', '解析', '分类', '难度'],
  ['以下哪个是JavaScript的数据类型？', '单选', 'A.number B.boolean C.undefined D.以上都是', 'D', 'JavaScript有六种基本数据类型：number、string、boolean、undefined、null、symbol', '前端基础', '简单'],
  ['以下哪些是ES6引入的新特性？', '多选', 'A.let B.const C.var D.箭头函数', 'A,B,D', 'ES6引入了let、const、箭头函数、Promise等新特性', '前端基础', '中等'],
  ['HTTP状态码404表示服务器内部错误。', '判断', 'A.正确 B.错误', 'B', '404表示资源不存在，500才是服务器内部错误', '网络基础', '简单'],
  ['以下关于CSS盒模型的说法正确的是？', '单选', 'A.margin包含在width内 B.padding包含在width内 C.border包含在width内 D.标准盒模型中width指content宽度', 'D', '标准盒模型width=content，IE盒模型width=content+padding+border', '前端基础', '中等'],
  ['以下哪些是JavaScript的原始类型？', '多选', 'A.String B.Number C.Object D.Boolean', 'A,B,D', 'Object是引用类型，不是原始类型', '前端基础', '简单'],
  ['Vue3中Composition API的优势有哪些？', '多选', 'A.更好的逻辑复用 B.更好的TypeScript支持 C.更好的代码组织 D.更小的打包体积', 'A,B,C', 'Composition API提供了更好的逻辑复用和代码组织能力', 'Vue框架', '中等'],
  ['在JavaScript中，==和===的区别是什么？', '单选', 'A.没有区别 B.===比较值和类型，==只比较值 C.==比较值和类型，===只比较值 D.===速度更快', 'B', '===是严格相等，比较值和类型；==是宽松相等，会进行类型转换', '前端基础', '简单'],
  ['Promise有哪几种状态？', '多选', 'A.pending B.fulfilled C.rejected D.resolved', 'A,B,C', 'Promise有pending、fulfilled、rejected三种状态，resolved通常指fulfilled', '前端基础', '中等'],
  ['CSS中flex布局默认的主轴方向是？', '单选', 'A.水平方向 B.垂直方向 C.对角线方向 D.随机方向', 'A', 'flex-direction默认值是row，即水平方向', '前端基础', '简单'],
  ['箭头函数有自己的this绑定。', '判断', 'A.正确 B.错误', 'B', '箭头函数没有自己的this，它会捕获所在上下文的this值', '前端基础', '中等'],
  ['以下哪个不是Vue的指令？', '单选', 'A.v-if B.v-for C.v-show D.v-else', 'E', 'v-else不是独立指令，需要配合v-if或v-else-if使用', 'Vue框架', '简单'],
  ['以下哪些方法可以改变原数组？', '多选', 'A.push B.pop C.map D.splice', 'A,B,D', 'map不会改变原数组，会返回新数组', '前端基础', '中等'],
  ['JavaScript中typeof null的结果是？', '单选', 'A.null B.undefined C.object D.number', 'C', '这是JavaScript的一个历史遗留bug，typeof null返回object', '前端基础', '困难'],
  ['WebSocket协议的默认端口是？', '单选', 'A.80 B.443 C.8080 D.没有默认端口', 'D', 'WebSocket没有默认端口，ws://使用80，wss://使用443', '网络基础', '中等'],
  ['HTTP/2相比HTTP/1.1的主要改进包括？', '多选', 'A.多路复用 B.头部压缩 C.服务器推送 D.更安全', 'A,B,C', 'HTTP/2支持多路复用、头部压缩、服务器推送等特性', '网络基础', '困难']
];

const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.aoa_to_sheet(questions);

// 设置列宽
worksheet['!cols'] = [
  { wch: 40 }, // 题目
  { wch: 8 },  // 类型
  { wch: 60 }, // 选项
  { wch: 10 }, // 答案
  { wch: 50 }, // 解析
  { wch: 10 }, // 分类
  { wch: 8 }   // 难度
];

XLSX.utils.book_append_sheet(workbook, worksheet, '题目');

const outputPath = join(__dirname, 'test-questions.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log('题库文件已生成:', outputPath);
console.log('共', questions.length - 1, '道题目');
