/*
 * @Author: Libra
 * @Date: 2024-12-04 16:14:39
 * @LastEditors: Libra
 * @Description: 
 */

import { post, get } from '../utils/request.js';
import xlsx from 'xlsx';
import fs from 'fs/promises';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';
import { readConfig } from '../utils/index.js';

// 保存已分配的考生数据，用于确保科目间不重复
let allocatedCandidates = new Set();

/**
 * 重置考生分配状态
 * 在开始新的考试创建时调用
 */
export function resetCandidateAllocation() {
  allocatedCandidates = new Set();
}

/**
 * 创建考试项目
 * @param {Object} projectData 项目数据
 * @returns {Promise<string>} 项目ID
 */
export async function createProject(projectData) {
  try {
    const result = await post('/project/add', projectData);
    return result.data;
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(`创建项目失败: ${error.message}`);
  }
}

/**
 * 获取项目信息
 * @param {string} projectId 项目ID
 * @returns {Promise<Object>} 项目信息
 */
export async function getProjectInfo(projectId) {
  try {
    const result = await get(`/project/info/${projectId}`);
    return result.data;
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(`获取项目信息失败: ${error.message}`);
  }
}

/**
 * 创建考试时段
 * @param {Object} periodData 时段数据
 * @param {number} currentPeriodCount 当前已创建的时段数
 * @returns {Promise<string>} 时段ID
 */
export async function createPeriod(periodData, currentPeriodCount) {
  try {
    await post('/period/add', periodData);
    // 获取项目信息来获取最新创建的时段ID
    const projectInfo = await getProjectInfo(periodData.projectId);
    // 根据当前时段数获取对应的时段ID
    const periodId = projectInfo.periodIdList[currentPeriodCount];
    if (!periodId) {
      throw new Error('未能获取到时段ID');
    }
    return periodId;
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(`创建时段失败: ${error.message}`);
  }
}

/**
 * 创建考试科目
 * @param {Object} subjectData 科目数据
 * @returns {Promise<string>} 科目ID
 */
export async function createSubject(subjectData) {
  try {
    const result = await post('/subject/add', subjectData);
    return result.data;
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(`创建科目失败: ${error.message}`);
  }
}

/**
 * 创建考试子卷
 * @param {Object} partData 子卷数据
 * @returns {Promise<string>} 子卷ID
 */
export async function createPart(partData) {
  try {
    const result = await post('/part/add', partData);
    return result.data;
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(`创建子卷失败: ${error.message}`);
  }
}

// 默认的试题列表
const defaultQuestionList = [
  // 40分题（2道）
  { questionId: "674ebd6157f77c628a082bbc", score: 20, groupScore: [] },
  { questionId: "674ebd6157f77c628a082bbb", score: 20, groupScore: [] },
  // 20分题（4道）
  { questionId: "674ebd6157f77c628a082bba", score: 5, groupScore: [] },
  { questionId: "674ebd6157f77c628a082bb9", score: 5, groupScore: [] },
  { questionId: "674ebd6157f77c628a082bb7", score: 5, groupScore: [1,1,1,1,1] },
  { questionId: "674ebd6157f77c628a082bb6", score: 5, groupScore: [1,1,1,1,1] },
  // 20分题（4道）
  { questionId: "674ebd6157f77c628a082bb5", score: 5, groupScore: [1,1,1,1,1] },
  { questionId: "674ebd6157f77c628a082bb4", score: 5, groupScore: [1,1,1,1,1] },
  { questionId: "674ebd6157f77c628a082bb2", score: 2, groupScore: [] },
  { questionId: "674ebd6157f77c628a082bb1", score: 2, groupScore: [] },
  // 20分题（10道）
  { questionId: "674ebd6157f77c628a082bb0", score: 2, groupScore: [] },
  { questionId: "674ebd6157f77c628a082baf", score: 2, groupScore: [] },
  { questionId: "674ebd6157f77c628a082bae", score: 2, groupScore: [] },
  { questionId: "674ebd6157f77c628a082bad", score: 2, groupScore: [] },
  { questionId: "674ebd6157f77c628a082bac", score: 2, groupScore: [] },
  { questionId: "674ebd6157f77c628a082bab", score: 2, groupScore: [] },
  { questionId: "674ebd6157f77c628a082baa", score: 2, groupScore: [] },
  { questionId: "674ebd6157f77c628a082ba9", score: 2, groupScore: [] },
  { questionId: "674ebd6157f77c628a082ba7", score: 1, groupScore: [] },
  { questionId: "674ebd6157f77c628a082ba6", score: 1, groupScore: [] }
];

/**
 * 填充子卷试题
 * @param {string} partId 子卷ID
 * @param {number} partIndex 子卷索引
 * @param {number} totalParts 科目下的总子卷数
 * @returns {Promise<boolean>} 是否成功
 */
export async function fillPartQuestions(partId, partIndex, totalParts) {
  try {
    // 计算每个子卷应该分配的题目数量
    const questionsPerPart = Math.floor(defaultQuestionList.length / totalParts);
    // 计算剩余的题目数量
    const remainingQuestions = defaultQuestionList.length % totalParts;
    
    // 计算当前子卷的起始索引
    const startIndex = partIndex * questionsPerPart + Math.min(partIndex, remainingQuestions);
    // 计算当前子卷应该分配的题目数量（如果有剩余题目，前面的子卷多分配一道题）
    const currentPartQuestions = questionsPerPart + (partIndex < remainingQuestions ? 1 : 0);
    
    // 获取分配给当前子卷的试题
    const questionList = defaultQuestionList.slice(startIndex, startIndex + currentPartQuestions);
    
    await post('/part/fill', {
      partId,
      questionList
    });
    return true;
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(`填充试题失败: ${error.message}`);
  }
}

/**
 * 拆分Excel文件，确保不同科目的考生不重复
 * @param {string} sourceFile 源Excel文件路径
 * @param {number} totalSubjects 总科目数
 * @param {number} currentSubjectIndex 当前科目索引
 * @returns {Promise<string>} 生成的Excel文件路径
 */
async function splitExcelFile(sourceFile, totalSubjects, currentSubjectIndex) {
  // 读取源Excel文件
  const workbook = xlsx.readFile(sourceFile);
  const sheetName = workbook.SheetNames[0];
  const sourceData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  // 过滤掉已分配的考生
  const availableCandidates = sourceData.filter(candidate => {
    // 使用考生的唯一标识（假设是身份证号）作为键
    const key = candidate.idNumber || candidate.id || JSON.stringify(candidate);
    return !allocatedCandidates.has(key);
  });

  // 计算当前科目应该分配的考生数量
  const totalAvailable = availableCandidates.length;
  const remainingSubjects = totalSubjects - currentSubjectIndex;
  const candidatesForThisSubject = Math.floor(totalAvailable / remainingSubjects);

  if (candidatesForThisSubject === 0) {
    throw new Error(`没有足够的考生分配到科目 ${currentSubjectIndex + 1}`);
  }

  // 随机选择考生
  const selectedCandidates = availableCandidates
    .sort(() => Math.random() - 0.5)
    .slice(0, candidatesForThisSubject);

  // 将选中的考生标记为已分配
  selectedCandidates.forEach(candidate => {
    const key = candidate.idNumber || candidate.id || JSON.stringify(candidate);
    allocatedCandidates.add(key);
  });

  const tempDir = path.join(process.cwd(), 'temp');

  // 创建临时目录
  try {
    await fs.mkdir(tempDir);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }

  // 创建Excel文件
  const newWorkbook = xlsx.utils.book_new();
  const newSheet = xlsx.utils.json_to_sheet(selectedCandidates);
  xlsx.utils.book_append_sheet(newWorkbook, newSheet, 'Sheet1');

  const fileName = path.join(tempDir, `candidates_subject${currentSubjectIndex + 1}.xlsx`);
  xlsx.writeFile(newWorkbook, fileName);

  console.log(`科目 ${currentSubjectIndex + 1} 分配到 ${selectedCandidates.length} 名考生`);

  return fileName;
}

/**
 * 导入考生
 * @param {string} periodId 时段ID
 * @param {string} subjectId 科目ID
 * @param {string} excelFile Excel文件路径
 * @returns {Promise<void>}
 */
async function importCandidates(periodId, subjectId, excelFile) {
  const formData = new FormData();
  const fileStream = await fs.readFile(excelFile);
  formData.append('file', fileStream, {
    filename: path.basename(excelFile),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const config = await readConfig();
  const url = `${config.apiBaseUrl}/candidate/import/${periodId}/${subjectId}`;

  try {
    await axios.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${config.token}`
      }
    });
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(`导入考生失败: ${error.message}`);
  }
}

/**
 * 清理临时文件
 * @param {string} file 要删除的文件路径
 */
async function cleanupFile(file) {
  try {
    await fs.unlink(file);
  } catch (error) {
    console.error(`删除文件 ${file} 失败:`, error);
  }

  // 尝试删除临时目录
  try {
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.rmdir(tempDir);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('删除临时目录失败:', error);
    }
  }
}

/**
 * 为科目导入考生
 * @param {string} periodId 时段ID
 * @param {string} subjectId 科目ID
 * @param {string} sourceFile 源Excel文件路径
 * @param {number} totalSubjects 总科目数
 * @param {number} currentSubjectIndex 当前科目索引
 */
export async function importSubjectCandidates(periodId, subjectId, sourceFile, totalSubjects, currentSubjectIndex) {
  // 验证文件是否为Excel
  const fileExt = path.extname(sourceFile).toLowerCase();
  if (fileExt !== '.xlsx' && fileExt !== '.xls') {
    throw new Error('只支持Excel文件(.xlsx或.xls)导入');
  }

  let tempFile = null;
  try {
    // 拆分Excel文件
    tempFile = await splitExcelFile(sourceFile, totalSubjects, currentSubjectIndex);

    // 导入考生
    await importCandidates(periodId, subjectId, tempFile);
  } catch (error) {
    throw error;
  } finally {
    // 清理临时文件
    if (tempFile) {
      await cleanupFile(tempFile);
    }
  }
}

/**
 * 为时段分配考点
 * @param {string} projectId 项目ID
 * @param {string} periodId 时段ID
 * @param {number} candidateCount 考生数量
 * @returns {Promise<void>}
 */
export async function assignSiteToPeriod(projectId, periodId, candidateCount) {
  try {
    const siteId = "6603b408dad61327e28bcbbe"; // 固定的考点ID
    await post('/confirm/add', {
      projectId,
      periodId,
      siteId,
      candidateCount
    });
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(`分配考点失败: ${error.message}`);
  }
}

/**
 * 获取时段的确认信息
 * @param {string} periodId 时段ID
 * @returns {Promise<string>} confirmId
 */
async function getConfirmId(periodId) {
  try {
    const result = await get(`/confirm/site/selected/${periodId}`);
    if (!result.data || !result.data.length || !result.data[0].confirmId) {
      throw new Error('未找到确认信息');
    }
    return result.data[0].confirmId;
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(`获取确认信息失败: ${error.message}`);
  }
}

/**
 * 提交考点确认
 * @param {string} confirmId 确ID
 * @param {boolean} useMultipleRooms 是否使用多个考场
 * @returns {Promise<void>}
 */
export async function submitConfirm(confirmId, useMultipleRooms = false) {
  try {
    // 固定的考场ID列表
    const allRooms = ["6603b4b2dad61327e28bcbc0", "6669504cadc9730a1e620065"];
    const roomIdList = useMultipleRooms ? allRooms : [allRooms[0]];

    await post('/confirm/operator/submit', {
      confirmId,
      roomIdList
    });
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(`提交确认失败: ${error.message}`);
  }
}

/**
 * 完成时段确认流程
 * @param {string} periodId 时段ID
 * @param {boolean} useMultipleRooms 是否使用多个考场
 */
export async function confirmPeriod(periodId, useMultipleRooms) {
  // 1. 获取confirmId
  const confirmId = await getConfirmId(periodId);
  // 2. 提交确认
  await submitConfirm(confirmId, useMultipleRooms);
}

/**
 * 自动编排时段
 * @param {string} periodId 时段ID
 * @param {boolean} random 是否科目交叉编排，默认false（科目平行编排）
 * @returns {Promise<void>}
 */
export async function autoArrangePeriod(periodId, random = false) {
  try {
    await post('/period/arrange/auto', {
      periodId,
      random
    });
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(`自动编排失败: ${error.message}`);
  }
}

/**
 * 生成科目试卷
 * @param {string} projectId 项目ID
 * @param {string} periodId 时段ID
 * @param {string} subjectId 科目ID
 * @returns {Promise<void>}
 */
export async function generateSubjectPaper(projectId, periodId, subjectId) {
  try {
    await post('/subject/generate/paper', {
      projectId,
      periodId,
      subjectId
    });
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(`生成试卷失败: ${error.message}`);
  }
}

/**
 * 上线考试项目
 * @param {string} projectId 项目ID
 * @returns {Promise<void>}
 */
export async function onlineProject(projectId) {
  try {
    await get(`/project/online/${projectId}`);
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(`上线考试失败: ${error.message}`);
  }
}

/**
 * 生成准考证
 * @param {string} projectId 项目ID
 * @returns {Promise<void>}
 */
export async function generateAdmissionCard(projectId) {
  try {
    await get(`/admission/preheat/${projectId}`);
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(`生成准考证失败: ${error.message}`);
  }
}

/**
 * 延时函数
 * @param {number} ms 延时毫秒数
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 时段就绪
 * @param {string} periodId 时段ID
 * @returns {Promise<void>}
 */
export async function setPeriodReady(periodId) {
  try {
    await get(`/period/ready/${periodId}`);
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error(`时段就绪失败: ${error.message}`);
  }
}