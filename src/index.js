#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import figlet from 'figlet';
import path from 'path';
import { createProject, createPeriod, createSubject, createPart, fillPartQuestions, importSubjectCandidates, resetCandidateAllocation, assignSiteToPeriod, confirmPeriod, autoArrangePeriod, generateSubjectPaper, onlineProject, generateAdmissionCard, setPeriodReady } from './services/exam.js';
import { readConfig } from './utils/index.js';
import fs from 'fs/promises';
import xlsx from 'xlsx';

const program = new Command();

console.log(chalk.blue(figlet.textSync('Create Exam CLI', { horizontalLayout: 'full' })));

program
  .version('1.0.0')
  .description('一个用于创建考试的命令行工具');

program
  .command('create')
  .description('创建新的考试')
  .requiredOption('-c, --config <path>', '配置文件路径')
  .action(async (options) => {
    try {
      const spinner = ora('正在创建考试...').start();
      
      const config = await readConfig();

      // 检查考生文件是否存在
      const candidatesFile = path.join(process.cwd(), 'assets', 'candidates.xlsx');
      try {
        await fs.access(candidatesFile);
      } catch (error) {
        spinner.warn('未找到考生文件 assets/candidates.xlsx，将跳过考生导入');
      }

      // 重置考生分配状态
      resetCandidateAllocation();

      // 计算总科目数
      const totalSubjects = config.periods.reduce((total, period) => total + period.subjects.length, 0);
      let currentSubjectIndex = 0;

      // 存储所有时段ID，用于最后设置就绪状态
      const periodIds = [];

      // 1. 创建项目
      spinner.text = '正在创建项目...';
      const projectId = await createProject(config.project);
      spinner.succeed('项目创建成功！');
      console.log(chalk.green('项目ID：'), chalk.yellow(projectId));

      // 2. 创建时段和科目
      for (const [periodIndex, periodData] of config.periods.entries()) {
        // 创建时段
        spinner.start(`正在创建第 ${periodIndex + 1} 个时段 (${periodData.name})...`);
        const periodId = await createPeriod({
          ...periodData,
          projectId
        }, periodIndex);
        spinner.succeed(`时段 "${periodData.name}" 创建成功！`);
        console.log(chalk.green('时段ID：'), chalk.yellow(periodId));

        // 保存时段ID
        periodIds.push(periodId);

        // 记录这个时段的总考生数
        let periodCandidateCount = 0;

        // 创建该时段下的所有科目
        if (periodData.subjects && periodData.subjects.length > 0) {
          for (const [subjectIndex, subjectData] of periodData.subjects.entries()) {
            spinner.start(`正在创建时段 "${periodData.name}" 的第 ${subjectIndex + 1} 个科目 (${subjectData.name})...`);
            const subjectId = await createSubject({
              ...subjectData,
              periodId
            });
            spinner.succeed(`科目 "${subjectData.name}" 创建成功！`);
            console.log(chalk.green('科目ID：'), chalk.yellow(subjectId));

            // 创建该科目下的所有子卷
            if (subjectData.parts && subjectData.parts.length > 0) {
              const totalParts = subjectData.parts.length;
              for (const [partIndex, partData] of subjectData.parts.entries()) {
                spinner.start(`正在创建科目 "${subjectData.name}" 的第 ${partIndex + 1} 个子卷 (${partData.name})...`);
                const partId = await createPart({
                  ...partData,
                  projectId,
                  periodId,
                  subjectId
                });
                spinner.succeed(`子卷 "${partData.name}" 创建成功！`);
                console.log(chalk.green('子卷ID：'), chalk.yellow(partId));

                // 填充试题
                spinner.start(`正在为子卷 "${partData.name}" 填充试题...`);
                await fillPartQuestions(partId, partIndex, totalParts);
                spinner.succeed(`子卷 "${partData.name}" 试题填充成功！`);
              }

              // 生成试卷
              spinner.start(`正在为科目 "${subjectData.name}" 生成试卷...`);
              try {
                await generateSubjectPaper(projectId, periodId, subjectId);
                spinner.succeed(`科目 "${subjectData.name}" 试卷生成成功！`);
              } catch (error) {
                spinner.fail(`科目 "${subjectData.name}" 试卷生成失败！`);
                console.error(chalk.yellow('警告：'), error.message);
              }

              // 导入考生（如果文件存在）
              try {
                await fs.access(candidatesFile);
                spinner.start(`正在为科目 "${subjectData.name}" 导入考生...`);
                try {
                  await importSubjectCandidates(
                    periodId,
                    subjectId,
                    candidatesFile,
                    totalSubjects,
                    currentSubjectIndex
                  );
                  // 更新时段的考生总数
                  const workbook = xlsx.readFile(candidatesFile);
                  const sheetName = workbook.SheetNames[0];
                  const sourceData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
                  const candidatesPerSubject = Math.floor(sourceData.length / totalSubjects);
                  periodCandidateCount += candidatesPerSubject;
                  spinner.succeed(`科目 "${subjectData.name}" 考生导入成功！`);
                } catch (error) {
                  spinner.fail(`科目 "${subjectData.name}" 考生导入失败！`);
                  console.error(chalk.yellow('警告：'), error.message);
                }
              } catch (error) {
                // 文件不存在，跳过导入
                spinner.warn('未找到考生文件 assets/candidates.xlsx，将跳过考生导入');
              }
            }
            
            // 更新科目计数
            currentSubjectIndex++;
          }
        }

        // 为时段分配考点
        if (periodCandidateCount > 0) {
          spinner.start(`正在为时段 "${periodData.name}" 分配考点...`);
          try {
            await assignSiteToPeriod(projectId, periodId, periodCandidateCount + 10);
            spinner.succeed(`时段 "${periodData.name}" 考点分配成功！`);

            // 确认考点
            spinner.start(`正在确认时段 "${periodData.name}" 的考点信息...`);
            try {
              await confirmPeriod(periodId, config.useMultipleRooms);
              spinner.succeed(`时段 "${periodData.name}" 考点确认成功！`);

              // 自动编排
              spinner.start(`正在为时段 "${periodData.name}" 进行自动编排...`);
              try {
                await autoArrangePeriod(periodId);
                spinner.succeed(`时段 "${periodData.name}" 自动编排成功！`);
              } catch (error) {
                spinner.fail(`时段 "${periodData.name}" 自动编排失败！`);
                console.error(chalk.yellow('警告：'), error.message);
              }
            } catch (error) {
              spinner.fail(`时段 "${periodData.name}" 考点确认失败！`);
              console.error(chalk.yellow('警告：'), error.message);
            }
          } catch (error) {
            spinner.fail(`时段 "${periodData.name}" 考点分配失败！`);
            console.error(chalk.yellow('警告：'), error.message);
          }
        }
      }

      // 上线考试
      spinner.start('正在上线考试...');
      try {
        await onlineProject(projectId);
        spinner.succeed('考试上线成功！');

        // 生成准考证
        spinner.start('正在生成准考证...');
        try {
          await generateAdmissionCard(projectId);
          spinner.succeed('准考证生成成功！');

          // 等待10秒
          spinner.start('等待准考证生成完成...');
          await new Promise(resolve => setTimeout(resolve, 10000));
          spinner.succeed('准考证生成完成！');

          // 设置每个时段为就绪状态
          for (const [index, periodId] of periodIds.entries()) {
            spinner.start(`正在设置第 ${index + 1} 个时段为就绪状态...`);
            try {
              await setPeriodReady(periodId);
              spinner.succeed(`第 ${index + 1} 个时段设置就绪成功！`);
            } catch (error) {
              spinner.fail(`第 ${index + 1} 个时段设置就绪失败！`);
              console.error(chalk.yellow('警告：'), error.message);
            }
          }
        } catch (error) {
          spinner.fail('准考证生成失败！');
          console.error(chalk.yellow('警告：'), error.message);
        }
      } catch (error) {
        spinner.fail('考试上线失败！');
        console.error(chalk.yellow('警告：'), error.message);
      }

      spinner.succeed(chalk.green('所有考试内容创建完成！'));
    } catch (error) {
      console.error(chalk.red('创建考试失败：'), error.message);
      process.exit(1);
    }
  });

program.parse(process.argv); 